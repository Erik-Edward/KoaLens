// app/providers/QueryClientProvider.tsx
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query'
import { FC, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data anses "stale" efter 5 minuter
      gcTime: 1000 * 60 * 30,   // Garbage collection efter 30 minuter
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const QueryClientProvider: FC<Props> = ({ children }) => {
  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  )
}

export default QueryClientProvider