import type { ChatMessage, ChatOptions, LLMProvider } from './provider.types.js'
import { SettingsStore } from '../modules/settings/settings.store.js'

export class OpenAIBaseProvider implements LLMProvider {
  constructor(
    public readonly name: 'openai' | 'openrouter' | 'deepseek' | 'opencode',
    private readonly settingsStore: SettingsStore,
    private readonly defaultModel: string,
  ) {}

  private async getKeys() {
    const s = await this.settingsStore.get()
    const primary = s[this.name]
    if (primary && primary.apiKey) {
      return { ...primary, resolvedName: this.name }
    }

    // Fallback to any configured provider
    const order = ['opencode', 'openrouter', 'openai', 'deepseek'] as const
    for (const key of order) {
      const fallback = s[key]
      if (fallback && fallback.apiKey) {
        return { ...fallback, resolvedName: key }
      }
    }

    return { ...primary, resolvedName: this.name }
  }

  async complete(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const { apiKey, baseUrl, resolvedName } = await this.getKeys()
    if (!apiKey) {
      throw new Error(`API key for provider ${this.name} is not configured.`)
    }

    const model = options?.model ?? this.defaultModel
    console.log(`[LLM] Complete: routing '${this.name}' to '${resolvedName}' (model: ${model})`)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.4,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`[${this.name}] Request failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json() as any
    return data.choices?.[0]?.message?.content ?? ''
  }

  async stream(
    messages: ChatMessage[],
    options: ChatOptions,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const { apiKey, baseUrl, resolvedName } = await this.getKeys()
    if (!apiKey) {
      throw new Error(`API key for provider ${this.name} is not configured.`)
    }

    const model = options.model ?? this.defaultModel
    console.log(`[LLM] Stream: routing '${this.name}' to '${resolvedName}' (model: ${model})`)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1000,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`[${this.name}] Stream request failed: ${response.statusText} - ${errorText}`)
    }

    const body = response.body
    if (!body) {
      throw new Error(`[${this.name}] No response body received.`)
    }

    let fullText = ''
    let buffer = ''
    const decoder = new TextDecoder()

    for await (const chunk of body as any) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6).trim()
          if (dataStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(dataStr)
            const content = parsed.choices?.[0]?.delta?.content ?? ''
            if (content) {
              fullText += content
              onChunk(content)
            }
          } catch {
            // Ignore incomplete chunks
          }
        }
      }
    }

    return fullText
  }
}
