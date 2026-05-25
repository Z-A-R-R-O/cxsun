import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './assets/css/index.css'
import App from './App.tsx'
import { notifyAuthInvalid } from './features/auth/auth-client.ts'

function isForbiddenError(error: unknown) {
  return error instanceof Error && /\bstatus 403\b/i.test(error.message)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isForbiddenError(error)) notifyAuthInvalid()
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isForbiddenError(error)) notifyAuthInvalid()
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
