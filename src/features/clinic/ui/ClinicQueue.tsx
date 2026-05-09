import { useWalletUi } from "@wallet-ui/react";
import { Send } from "lucide-react";
import { useConsentAction, useConsents } from "../../consent/data-access/useConsents";

export function ClinicQueue() {
  const { account } = useWalletUi();
  const consents = useConsents(account?.address);
  const issue = useConsentAction("issue");
  const approved = consents.data?.consents.filter((consent) => consent.status === "approved") ?? [];

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <p className="panel-title">Clinic operator</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Issue queue</h2>
      <div className="mt-4 grid gap-2">
        {!account ? <p className="text-sm text-slate-400">Connect a patient wallet to load approved packets.</p> : null}
        {approved.length === 0 ? <p className="text-sm text-slate-400">No approved packets waiting.</p> : null}
        {approved.map((consent) => (
          <div className="rounded-md border border-white/10 bg-black/25 p-3" key={consent.id}>
            <p className="text-sm font-semibold text-white">{consent.providerName}</p>
            <p className="mt-1 text-xs text-slate-400">{consent.releaseCode}</p>
            <button className="ghost mt-3 w-full" disabled={issue.isPending} onClick={() => issue.mutate({ id: consent.id })}>
              <Send size={16} />
              Issue MPL pass
            </button>
          </div>
        ))}
        {issue.isError ? <p className="text-sm text-amberline">{issue.error.message}</p> : null}
      </div>
    </section>
  );
}
