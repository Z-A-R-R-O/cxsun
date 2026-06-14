import { Injectable } from '../../core/decorators/injectable.js'

@Injectable()
export class TokenService {
  countTokens(text: string): number {
    if (!text) return 0
    return Math.ceil(text.length / 4)
  }

  compress(text: string, maxTokens: number): string {
    const currentTokens = this.countTokens(text)
    if (currentTokens <= maxTokens) return text

    const targetLength = maxTokens * 4
    const keepLength = Math.floor(targetLength / 2)

    const head = text.substring(0, keepLength)
    const tail = text.substring(text.length - keepLength)

    return `${head}\n\n[... Context compressed: truncated ${text.length - targetLength} characters ...]\n\n${tail}`
  }
}
