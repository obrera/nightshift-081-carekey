export function buildSiwsMessage(input: { domain: string; statement: string; walletAddress: string; nonce: string }) {
  return `${input.domain} wants you to sign in with your Solana account ${input.walletAddress}. ${input.statement} Nonce: ${input.nonce}`;
}
