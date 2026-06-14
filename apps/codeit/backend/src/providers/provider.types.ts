export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMProvider {
  readonly name: string
  complete(messages: ChatMessage[], options?: ChatOptions): Promise<string>
  stream(messages: ChatMessage[], options: ChatOptions, onChunk: (chunk: string) => void): Promise<string>
}
