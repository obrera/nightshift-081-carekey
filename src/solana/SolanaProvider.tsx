import { createSolanaDevnet, createSolanaLocalnet, createSolanaTestnet, createWalletUiConfig, WalletUi } from "@wallet-ui/react";
import type { ReactNode } from "react";

const walletUiConfig = createWalletUiConfig({
  clusters: [
    createSolanaDevnet("https://api.devnet.solana.com"),
    createSolanaTestnet("https://api.testnet.solana.com"),
    createSolanaLocalnet("http://127.0.0.1:8899")
  ]
});

export function SolanaProvider({ children }: { children: ReactNode }) {
  return <WalletUi config={walletUiConfig}>{children}</WalletUi>;
}
