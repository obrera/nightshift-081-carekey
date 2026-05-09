import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, postJson } from "../../../lib/api";
import type { Consent, Session } from "../../../lib/types";

export function useConsents(wallet?: string) {
  return useQuery({
    queryKey: ["consents", wallet],
    queryFn: () => apiRequest<{ consents: Consent[] }>(`/api/consents?wallet=${encodeURIComponent(wallet ?? "")}`),
    enabled: Boolean(wallet)
  });
}

export function useCreateConsent(wallet?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { providerName: string; verifierWallet: string; scopes: string[]; hoursValid: number }) => {
      const session = queryClient.getQueryData<Session>(["session"]);
      return postJson<{ consent: Consent }>("/api/consents", {
        sessionId: session?.sessionId ?? "",
        patientWallet: wallet ?? "",
        ...payload
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consents"] })
  });
}

export function useConsentAction(action: "approve" | "revoke" | "extend", wallet?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; hours?: number }) => {
      const session = queryClient.getQueryData<Session>(["session"]);
      return postJson<{ consent: Consent }>(`/api/consents/${payload.id}/${action}`, {
        ...(action === "extend" ? { hours: payload.hours ?? 72 } : {}),
        sessionId: session?.sessionId ?? "",
        walletAddress: wallet ?? ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    }
  });
}
