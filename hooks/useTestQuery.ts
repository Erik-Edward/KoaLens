import { useQuery } from '@tanstack/react-query'
import { fetchTestData } from '@/services/api'

export const useTestQuery = () => {
  return useQuery({
    queryKey: ['test'],
    queryFn: fetchTestData
  })
}