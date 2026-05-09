import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import type { Bootstrap } from "../../../lib/types";

export function useBootstrap() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => apiRequest<Bootstrap>("/api/bootstrap")
  });
}
