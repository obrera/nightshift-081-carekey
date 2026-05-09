import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import type { AuditEvent } from "../../../lib/types";

export function useAudit() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () => apiRequest<{ events: AuditEvent[] }>("/api/audit")
  });
}
