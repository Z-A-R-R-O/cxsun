export {
  callWhiteBooks,
  redactedWhiteBooksHeaders,
  redactedWhiteBooksRequestHeaders,
  whiteBooksProductionBaseUrl,
  whiteBooksOperationDefinition,
  whiteBooksSandboxBaseUrl,
  type WhiteBooksRequest,
  type WhiteBooksResponse,
} from './whitebooks.client.js'

import { callWhiteBooks, redactedWhiteBooksHeaders, redactedWhiteBooksRequestHeaders, whiteBooksOperationDefinition } from './whitebooks.client.js'

export const whiteBooksProvider = {
  call: callWhiteBooks,
  definition: whiteBooksOperationDefinition,
  key: 'whitebooks',
  redactedRequestHeaders: redactedWhiteBooksRequestHeaders,
  redactedHeaders: redactedWhiteBooksHeaders,
} as const
