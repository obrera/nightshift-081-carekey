import { useWalletUi } from "@wallet-ui/react";
import { Check, Clock3, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { useBootstrap } from "../data-access/useBootstrap";
import { useConsentAction, useConsents, useCreateConsent } from "../data-access/useConsents";
import { expiryLabel, statusTone } from "../feature/formatConsent";

export function ConsentWorkspace() {
  const { account } = useWalletUi();
  const bootstrap = useBootstrap();
  const consents = useConsents(account?.address);
  const createConsent = useCreateConsent(account?.address);
  const approve = useConsentAction("approve", account?.address);
  const revoke = useConsentAction("revoke", account?.address);
  const extend = useConsentAction("extend", account?.address);
  const [providerName, setProviderName] = useState("Northline Imaging");
  const [verifierWallet, setVerifierWallet] = useState("Vote111111111111111111111111111111111111111");
  const [hoursValid, setHoursValid] = useState(72);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["Imaging and labs", "Medication history"]);

  const toggleScope = (scope: string) => {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  };

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="panel-title">Patient consent pass</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Scoped release wizard</h2>
        </div>
        <Clock3 className="text-amberline" size={22} />
      </div>

      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          createConsent.mutate({ providerName, verifierWallet, scopes: selectedScopes, hoursValid });
        }}
      >
        {!account ? <p className="rounded-md border border-amberline/30 bg-amberline/10 p-3 text-sm text-amberline">Connect and sign with a patient wallet before creating a consent pass.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-300">
            Provider
            <input className="field" value={providerName} onChange={(event) => setProviderName(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm text-slate-300">
            Verifier wallet
            <input className="field" value={verifierWallet} onChange={(event) => setVerifierWallet(event.target.value)} />
          </label>
        </div>
        <label className="grid gap-1 text-sm text-slate-300">
          Access window
          <input
            className="field"
            type="number"
            min={1}
            max={720}
            value={hoursValid}
            onChange={(event) => setHoursValid(Number(event.target.value))}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(bootstrap.data?.releaseScopes ?? []).map((scope) => (
            <button
              className={selectedScopes.includes(scope) ? "action" : "ghost"}
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
            >
              {scope}
            </button>
          ))}
        </div>
        <button className="action w-full" disabled={createConsent.isPending || selectedScopes.length === 0 || !account}>
          Create consent packet
        </button>
      </form>

      <div className="mt-5 grid gap-3">
        {!account ? <p className="text-sm text-slate-400">Patient consent packets appear after wallet connection.</p> : null}
        {consents.isLoading ? <p className="text-sm text-slate-400">Loading consent passes...</p> : null}
        {consents.isError ? <p className="text-sm text-red-300">{consents.error.message}</p> : null}
        {consents.data?.consents.map((consent) => (
          <article key={consent.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{consent.providerName}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {consent.releaseCode} · {expiryLabel(consent)}
                </p>
              </div>
              <span className={`text-sm font-semibold ${statusTone(consent.status)}`}>{consent.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {consent.scopes.map((scope) => (
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200" key={scope}>
                  {scope}
                </span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="ghost" disabled={approve.isPending} onClick={() => approve.mutate({ id: consent.id })}>
                <Check size={16} />
                Approve
              </button>
              <button className="ghost" disabled={extend.isPending} onClick={() => extend.mutate({ id: consent.id, hours: 168 })}>
                <RotateCw size={16} />
                Extend
              </button>
              <button className="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate({ id: consent.id })}>
                <X size={16} />
                Revoke
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
