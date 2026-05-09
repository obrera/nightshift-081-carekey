import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../../lib/api";
import type { Consent } from "../../../lib/types";

export function useVerifyReleaseCode() {
  return useMutation({
    mutationFn: (code: string) => apiRequest<{ consent: Consent; valid: boolean }>(`/api/verify/${encodeURIComponent(code)}`)
  });
}
