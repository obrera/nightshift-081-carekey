import { Activity, BadgeCheck, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { AuditTrail } from "./features/audit/ui/AuditTrail";
import { ClinicQueue } from "./features/clinic/ui/ClinicQueue";
import { ConsentWorkspace } from "./features/consent/ui/ConsentWorkspace";
import { VerifierPanel } from "./features/consent/ui/VerifierPanel";
import { useBootstrap } from "./features/consent/data-access/useBootstrap";
import { WalletGate } from "./features/wallet/ui/WalletGate";

export function App() {
  const bootstrap = useBootstrap();

  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-panel/95 p-4 shadow-glow sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-pulse/15 text-pulse">
              <KeyRound size={24} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-clinical">CareKey</p>
              <h1 className="text-2xl font-semibold text-white">Time-boxed medical record access</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck className="text-pulse" size={18} />
            <span>{bootstrap.data?.network ?? "loading network"}</span>
          </div>
        </header>

        <WalletGate />

        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <ConsentWorkspace />
          <div className="grid gap-4">
            <VerifierPanel />
            <ClinicQueue />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Capability icon={<BadgeCheck size={20} />} label="Patient pass" text="Create, approve, extend, and revoke scoped releases." />
          <Capability icon={<Building2 size={20} />} label="Provider verifier" text="Check release codes before pulling protected records." />
          <Capability icon={<Activity size={20} />} label="Wallet issuance" text="Sign approved packets with the connected wallet before recording the MPL Core pass." />
        </section>

        <AuditTrail />
      </div>
    </main>
  );
}

function Capability(props: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2 text-pulse">
        {props.icon}
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">{props.label}</h2>
      </div>
      <p className="text-sm leading-6 text-slate-300">{props.text}</p>
    </div>
  );
}
