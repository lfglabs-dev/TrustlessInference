import { keccak256, toBytes, toHex } from "viem";

export interface Attestation {
  tee_platform: string;
  enclave_hash: string;
  input_hash: string;
  output_hash: string;
  model_hash: string;
  timestamp: number;
  signature: string;
}

function sha256Hex(data: string): string {
  const encoder = new TextEncoder();
  const buf = encoder.encode(data);
  // Use keccak256 as a stand-in since we're in a mock TEE context
  return keccak256(toBytes(toHex(buf)));
}

export function generateAttestation(
  input: string,
  output: string,
  modelHash: string
): Attestation {
  const timestamp = Math.floor(Date.now() / 1000);
  const inputHash = sha256Hex(input);
  const outputHash = sha256Hex(output);
  const enclaveHash = keccak256(
    toBytes("flare-fce-mock-enclave-v1")
  );

  // Signature = keccak256 of all fields concatenated
  const payload = `${enclaveHash}${inputHash}${outputHash}${modelHash}${timestamp}`;
  const signature = keccak256(toBytes(payload));

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
