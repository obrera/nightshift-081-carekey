import { type UiWalletAccount, useSignIn, useWalletUi, WalletUiDropdown } from "@wallet-ui/react";
import { Fingerprint, PlugZap, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useSiwsSession } from "../../auth/data-access/useSession";
import { buildSiwsMessage } from "../../auth/feature/sessionMessage";
import { useBootstrap } from "../../consent/data-access/useBootstrap";
import type { ActorMode } from "../../../lib/types";

export function WalletGate() {
  const [actor, setActor] = useState<ActorMode>("patient");
  const { account, connected, wallet } = useWalletUi();
  const bootstrap = useBootstrap();
  const nonce = useMemo(() => crypto.randomUUID(), []);
  const message =
    bootstrap.data && account
      ? buildSiwsMessage({
        domain: bootstrap.data.walletAuth.domain,
        statement: bootstrap.data.walletAuth.statement,
        walletAddress: account.address,
        nonce
      })
      : undefined;

  return (
    <section className="grid gap-3 rounded-lg border border-pulse/20 bg-pulse/[0.06] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-black/30 text-pulse">
          <Wallet size={20} />
        </div>
        <div>
          <p className="panel-title">Wallet-first access</p>
          <p className="mt-1 text-sm text-slate-300">
            Privileged actions require a connected Solana wallet and native Sign-In With Solana support.
          </p>
          {account ? <p className="mt-1 break-all text-xs text-pulse">{account.address}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select className="field sm:w-36" value={actor} onChange={(event) => setActor(event.target.value as ActorMode)}>
          <option value="patient">Patient</option>
          <option value="provider">Provider</option>
          <option value="clinic">Clinic</option>
        </select>
        <div className="wallet-ui-shell">
          <WalletUiDropdown label={connected ? "Wallet" : "Connect"} />
        </div>
        {wallet && account && bootstrap.data && message ? (
          <SiwsButton
            account={account}
            actor={actor}
            domain={bootstrap.data.walletAuth.domain}
            message={message}
            nonce={nonce}
            statement={bootstrap.data.walletAuth.statement}
            walletAddress={account.address}
          />
        ) : (
          <button className="ghost" disabled>
            <PlugZap size={18} />
            Connect wallet
          </button>
        )}
      </div>
    </section>
  );
}

function SiwsButton(props: {
  account: UiWalletAccount;
  actor: ActorMode;
  domain: string;
  message: string;
  nonce: string;
  statement: string;
  walletAddress: string;
}) {
  const session = useSiwsSession();
  const signIn = useSignIn(props.account);
  const [error, setError] = useState<string>();

  return (
    <div className="grid gap-1">
      <button
        className="action"
        disabled={session.isPending}
        onClick={async () => {
          setError(undefined);
          try {
            const result = await signIn({
              domain: props.domain,
              statement: props.statement,
              nonce: props.nonce,
              issuedAt: new Date().toISOString(),
              uri: window.location.origin,
              version: "1"
            });
            if (result.account.address !== props.walletAddress) {
              throw new Error("Wallet returned a different account for SIWS.");
            }
            session.mutate({
              walletAddress: props.walletAddress,
              actor: props.actor,
              domain: props.domain,
              statement: props.statement,
              nonce: props.nonce,
              signature: bytesToHex(result.signature)
            });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Connected wallet cannot complete SIWS.");
          }
        }}
      >
        <Fingerprint size={18} />
        Sign SIWS
      </button>
      {session.data ? <p className="text-xs text-pulse">Session active until {new Date(session.data.expiresAt).toLocaleString()}</p> : null}
      {error ? <p className="max-w-80 text-xs text-amberline">{error}</p> : null}
    </div>
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
