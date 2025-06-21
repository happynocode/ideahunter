import { useQuery } from "@tanstack/react-query";
import type { Industry } from "@/lib/types";

export function useIndustries() {
  return useQuery<Industry[]>({
    queryKey: ['/api/industries'],
    queryFn: async () => {
      const response = await fetch('/api/industries');
      if (!response.ok) {
        throw new Error('Failed to fetch industries');
      }
      return response.json();
    },
  });
}
