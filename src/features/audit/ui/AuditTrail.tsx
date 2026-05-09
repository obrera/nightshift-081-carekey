import { useAudit } from "../data-access/useAudit";

export function AuditTrail() {
  const audit = useAudit();

  return (
    <section className="rounded-lg border border-white/10 bg-panel p-4">
      <p className="panel-title">Release timeline</p>
      <div className="mt-4 grid gap-2">
        {audit.isLoading ? <p className="text-sm text-slate-400">Loading audit events...</p> : null}
        {audit.data?.events.map((event) => (
          <div className="grid gap-1 rounded-md border border-white/10 bg-black/20 p-3 text-sm sm:grid-cols-[10rem_1fr_auto]" key={event.id}>
            <span className="font-semibold text-clinical">{event.action}</span>
            <span className="text-slate-300">{event.detail}</span>
            <span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
