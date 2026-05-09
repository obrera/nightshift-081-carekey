import { SearchCheck } from "lucide-react";
import { useState } from "react";
import { useVerifyReleaseCode } from "../data-access/useVerifier";

export function VerifierPanel() {
  const [code, setCode] = useState("");
  const verify = useVerifyReleaseCode();

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <p className="panel-title">Provider verifier</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Release code check</h2>
      <form
        className="mt-4 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          verify.mutate(code);
        }}
      >
        <input className="field" placeholder="CK-1234-ABCD" value={code} onChange={(event) => setCode(event.target.value)} />
        <button className="action" disabled={verify.isPending || code.length < 4}>
          <SearchCheck size={18} />
          Verify access
        </button>
      </form>
      {verify.isError ? <p className="mt-3 text-sm text-red-300">{verify.error.message}</p> : null}
      {verify.data ? (
        <div className="mt-3 rounded-md border border-white/10 bg-black/25 p-3 text-sm">
          <p className={verify.data.valid ? "text-pulse" : "text-red-300"}>{verify.data.valid ? "Valid release" : "Not valid"}</p>
          <p className="mt-1 text-slate-300">{verify.data.consent.providerName}</p>
          <p className="mt-1 text-xs text-slate-500">{verify.data.consent.scopes.join(", ")}</p>
        </div>
      ) : null}
    </section>
  );
}
