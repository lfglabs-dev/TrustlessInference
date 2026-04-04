import { keccak256, toBytes, toHex, encodePacked } from "viem";
import { teeAccount } from "./gateway";

export interface Attestation {
  tee_platform: string;
  enclave_hash: string;
  input_hash: string;
  output_hash: string;
  model_hash: string;
  timestamp: number;
  signature: string;
  tx_hash?: string;
}

function hashText(data: string): `0x${string}` {
  const buf = new TextEncoder().encode(data);
  return keccak256(toBytes(toHex(buf)));
}

export async function generateAttestation(
  input: string,
  output: string,
  modelHash: string,
  userAddress: `0x${string}`
): Promise<Attestation> {
  const timestamp = Math.floor(Date.now() / 1000);
  const inputHash = hashText(input);
  const outputHash = hashText(output);
  const enclaveHash = keccak256(toBytes("flare-fce-mock-enclave-v1"));

  let signature: string;

  if (teeAccount) {
    // Real ECDSA signature matching the contract's expected format
    const messageHash = keccak256(
      encodePacked(
        ["address", "bytes32", "bytes32", "bytes32", "uint256"],
        [
          userAddress,
          inputHash,
          outputHash,
          modelHash as `0x${string}`,
          BigInt(timestamp),
        ]
      )
    );
    signature = await teeAccount.signMessage({ message: { raw: messageHash } });
  } else {
    // Fallback mock signature (keccak256)
    const payload = `${enclaveHash}${inputHash}${outputHash}${modelHash}${timestamp}`;
    signature = keccak256(toBytes(payload));
  }

  return {
    tee_platform: "flare-fce-mock-v1",
    enclave_hash: enclaveHash,
    input_hash: inputHash,
    output_hash: outputHash,
    model_hash: modelHash,
    timestamp,
    signature,
  };
}

export function computeModelHash(modelName: string): string {
  return keccak256(toBytes(modelName));
}
