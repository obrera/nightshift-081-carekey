import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJson } from "../../../lib/api";
import type { ActorMode, Session } from "../../../lib/types";

export function useSiwsSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      walletAddress: string;
      actor: ActorMode;
      domain: string;
      statement: string;
      nonce: string;
      signature: string;
      signatureBytes: number[];
      signedMessage: number[];
    }) => postJson<Session>("/api/auth/siws", payload),
    onSuccess: (session) => {
      queryClient.setQueryData(["session"], session);
    }
  });
}
