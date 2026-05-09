import { type UiWalletAccount, useWalletUi, useWalletUiSigner } from "@wallet-ui/react";
import { Send } from "lucide-react";
import type { Consent } from "../../../lib/types";
import { useIssueConsent } from "../data-access/useIssueConsent";
import { useConsents } from "../../consent/data-access/useConsents";

export function ClinicQueue() {
  const { account } = useWalletUi();
  const consents = useConsents(account?.address);
  const approved = consents.data?.consents.filter((consent) => consent.status === "approved") ?? [];

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <p className="panel-title">Patient wallet issuance</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Wallet-signed MPL queue</h2>
      <div className="mt-4 grid gap-2">
        {!account ? <p className="text-sm text-slate-400">Connect a patient wallet to load approved packets.</p> : null}
        {approved.length === 0 ? <p className="text-sm text-slate-400">No approved packets waiting.</p> : null}
        {account ? approved.map((consent) => <IssueConsentCard account={account} consent={consent} key={consent.id} />) : null}
      </div>
    </section>
  );
}

function IssueConsentCard(props: { account: UiWalletAccount; consent: Consent }) {
  const signer = useWalletUiSigner({ account: props.account });
  const issue = useIssueConsent(signer);

  return (
    <div className="rounded-md border border-white/10 bg-black/25 p-3">
      <p className="text-sm font-semibold text-white">{props.consent.providerName}</p>
      <p className="mt-1 text-xs text-slate-400">{props.consent.releaseCode}</p>
      <button className="ghost mt-3 w-full" disabled={issue.isPending} onClick={() => issue.mutate(props.consent)}>
        <Send size={16} />
        Sign and issue MPL pass
      </button>
      {issue.isError ? <p className="mt-2 text-sm text-amberline">{issue.error.message}</p> : null}
      {issue.data ? <p className="mt-2 break-all text-xs text-pulse">tx {issue.data.issued.signature}</p> : null}
    </div>
  );
}
