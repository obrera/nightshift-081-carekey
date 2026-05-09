import { MPL_CORE_PROGRAM_ADDRESS } from "@obrera/mpl-core-kit-lib";

const defaultRpcUrl = "https://api.devnet.solana.com";

export function mplStatus() {
  return {
    chain: "solana:devnet",
    configured: true,
    missing: [],
    mode: "wallet-signed",
    network: "devnet-wallet-signed",
    programAddress: String(MPL_CORE_PROGRAM_ADDRESS),
    rpcUrl: process.env.CAREKEY_MPL_RPC_URL ?? process.env.MPL_RPC_URL ?? defaultRpcUrl
  };
}

export function issueMetadata(input: { consentId: string; expiresAt: string; providerName: string; scopes: string[] }) {
  return {
    name: `CareKey ${input.providerName}`.slice(0, 32),
    programAddress: String(MPL_CORE_PROGRAM_ADDRESS)
  };
}

export function issueUri(input: { consentId: string; expiresAt: string; scopes: string[] }) {
  return `carekey://consent/${input.consentId}?expires=${encodeURIComponent(input.expiresAt)}&scopes=${encodeURIComponent(
    input.scopes.join(",")
  )}`;
}

export function issueStatus() {
  return {
    configured: true,
    missing: [],
    mode: "wallet-signed" as const
  };
}
