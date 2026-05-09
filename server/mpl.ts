import { MPL_CORE_PROGRAM_ADDRESS } from "@obrera/mpl-core-kit-lib";
import { getCreateV1Instruction } from "@obrera/mpl-core-kit-lib/generated";
import {
  address,
  appendTransactionMessageInstruction,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase58Encoder,
  getBase64Encoder,
  getSignatureFromTransaction,
  pipe,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners
} from "@solana/kit";

type IssueResult =
  | { ok: true; asset: string; signature: string }
  | { ok: false; status: 409; error: "missing_config"; missing: string[] }
  | { ok: false; status: 502; error: "issuance_failed"; detail: string };

const requiredEnv = ["MPL_RPC_URL", "MPL_ISSUER_PRIVATE_KEY", "MPL_ISSUER_ADDRESS"] as const;

export function mplStatus() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing,
    network: process.env.MPL_RPC_URL ? "custom-rpc" : "not-configured",
    programAddress: String(MPL_CORE_PROGRAM_ADDRESS)
  };
}

export async function issueConsentAsset(input: {
  consentId: string;
  patientWallet: string;
  scopes: string[];
  expiresAt: string;
  providerName: string;
}): Promise<IssueResult> {
  const status = mplStatus();
  if (!status.configured) {
    return { ok: false, status: 409, error: "missing_config", missing: status.missing };
  }

  try {
    const issuer = await getIssuerSigner();
    if (process.env.MPL_ISSUER_ADDRESS !== issuer.address) {
      throw new Error("MPL_ISSUER_ADDRESS does not match MPL_ISSUER_PRIVATE_KEY");
    }

    const asset = await generateKeyPairSigner();
    const rpc = createSolanaRpc(process.env.MPL_RPC_URL!);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const name = `CareKey ${input.providerName}`.slice(0, 32);
    const uri = `carekey://consent/${input.consentId}?expires=${encodeURIComponent(input.expiresAt)}&scopes=${encodeURIComponent(
      input.scopes.join(",")
    )}`;

    const instruction = getCreateV1Instruction({
      asset,
      authority: issuer,
      name,
      owner: address(input.patientWallet),
      payer: issuer,
      updateAuthority: issuer.address,
      uri
    });
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (message) => setTransactionMessageFeePayerSigner(issuer, message),
      (message) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, message),
      (message) => appendTransactionMessageInstruction(instruction, message)
    );
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc });
    await sendTransaction(signedTransaction, { commitment: "confirmed" });

    return { ok: true, asset: asset.address, signature };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: "issuance_failed",
      detail: error instanceof Error ? error.message : "Unknown MPL Core issuance failure"
    };
  }
}

async function getIssuerSigner() {
  const keypairBytes = parseSecretKey(process.env.MPL_ISSUER_PRIVATE_KEY!);
  return createKeyPairSignerFromBytes(keypairBytes);
}

function parseSecretKey(rawValue: string) {
  const value = rawValue.trim();
  if (value.startsWith("[")) {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("MPL_ISSUER_PRIVATE_KEY JSON must be an array");
    }
    return toSecretKeyBytes(parsed);
  }
  if (value.includes(",")) {
    return toSecretKeyBytes(value.split(",").map((part) => Number(part.trim())));
  }
  if (value.startsWith("base64:")) {
    return toSecretKeyBytes([...getBase64Encoder().encode(value.slice("base64:".length).trim())]);
  }
  return toSecretKeyBytes([...getBase58Encoder().encode(value)]);
}

function toSecretKeyBytes(values: unknown[]) {
  const bytes = values.map((value) => {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error("MPL_ISSUER_PRIVATE_KEY must contain byte values from 0 to 255");
    }
    return value;
  });
  if (bytes.length !== 64) {
    throw new Error("MPL_ISSUER_PRIVATE_KEY must decode to a 64-byte Solana secret key");
  }
  return new Uint8Array(bytes);
}
