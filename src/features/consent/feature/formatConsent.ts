import type { Consent } from "../../../lib/types";

export function expiryLabel(consent: Pick<Consent, "expiresAt">) {
  const expires = new Date(consent.expiresAt);
  const diff = expires.getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.round(diff / 3_600_000);
  return hours < 24 ? `${hours}h left` : `${Math.round(hours / 24)}d left`;
}

export function statusTone(status: Consent["status"]) {
  if (status === "approved") return "text-pulse";
  if (status === "released") return "text-clinical";
  if (status === "revoked") return "text-red-300";
  return "text-amberline";
}
