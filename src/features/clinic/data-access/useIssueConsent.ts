import { getCreateV1Instruction } from "@obrera/mpl-core-kit-lib/generated";
import {
  address,
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type TransactionSendingSigner
} from "@solana/kit";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, postJson } from "../../../lib/api";
import type { Consent, IssuePlan, Session } from "../../../lib/types";

export function useIssueConsent(signer: TransactionSendingSigner<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (consent: Consent) => {
      const session = queryClient.getQueryData<Session>(["session"]);
      if (!session) {
        throw new Error("sign_siws_first");
      }

      const plan = await apiRequest<IssuePlan>(`/api/consents/${consent.id}/issue-plan`);
      if (plan.issue.mode !== "wallet-signed" || plan.issue.missing.length > 0) {
        throw new Error("wallet_signed_issue_not_ready");
      }
      if (plan.issue.owner !== signer.address) {
        throw new Error("connected_wallet_must_own_consent");
      }

      const issued = await issueConsentWithWallet(plan, signer);
      return postJson<{ consent: Consent; issued: { asset: string; mode: "wallet-signed"; signature: string } }>(
        `/api/consents/${consent.id}/issue`,
        {
          asset: issued.asset,
          sessionId: session.sessionId,
          signature: issued.signature,
          walletAddress: signer.address
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      queryClient.invalidateQueries({ queryKey: ["consents"] });
    }
  });
}

async function issueConsentWithWallet(plan: IssuePlan, signer: TransactionSendingSigner<string>) {
  const asset = await generateKeyPairSigner();
  const rpc = createSolanaRpc(plan.mpl.rpcUrl);
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const instruction = getCreateV1Instruction({
    asset,
    authority: signer,
    name: plan.issue.name,
    owner: address(plan.issue.owner),
    payer: signer,
    updateAuthority: signer.address,
    uri: plan.issue.uri
  });
  const transactionMessage = pipe(
    createTransactionMessage({ version: "legacy" }),
    (message) => setTransactionMessageFeePayerSigner(signer, message),
    (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
    (message) => appendTransactionMessageInstruction(instruction, message)
  );
  const signatureBytes = await signAndSendTransactionMessageWithSigners(transactionMessage);
  return {
    asset: asset.address,
    signature: getBase58Decoder().decode(signatureBytes)
  };
}
