import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  INFERENCE_GATEWAY_ADDRESS,
  INFERENCE_GATEWAY_ABI,
} from "./contracts";

const coston2 = defineChain({
  id: 114,
  name: "Flare Coston2",
  nativeCurrency: { name: "Coston2 Flare", symbol: "C2FLR", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://coston2-api.flare.network/ext/C/rpc"] },
  },
  blockExplorers: {
    default: {
      name: "Coston2 Explorer",
      url: "https://coston2-explorer.flare.network",
    },
  },
  testnet: true,
});

const teePrivateKey = process.env.TEE_SIGNER_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

function createTeeAccount() {
  if (!teePrivateKey || !teePrivateKey.startsWith("0x")) return null;
  try {
    return privateKeyToAccount(teePrivateKey);
  } catch {
    return null;
  }
}

export const teeAccount = createTeeAccount();

export const teePublicClient = createPublicClient({
  chain: coston2,
  transport: http(),
});

export const teeWalletClient = teeAccount
  ? createWalletClient({
      account: teeAccount,
      chain: coston2,
      transport: http(),
    })
  : null;

export async function checkBalance(
  userAddress: `0x${string}`
): Promise<bigint> {
  const balance = await teePublicClient.readContract({
    address: INFERENCE_GATEWAY_ADDRESS,
    abi: INFERENCE_GATEWAY_ABI,
    functionName: "balances",
    args: [userAddress],
  });
  return balance;
}

export async function getInferenceCost(): Promise<bigint> {
  const cost = await teePublicClient.readContract({
    address: INFERENCE_GATEWAY_ADDRESS,
    abi: INFERENCE_GATEWAY_ABI,
    functionName: "inferenceCost",
  });
  return cost;
}

export async function submitProofOnChain(
  user: `0x${string}`,
  promptHash: `0x${string}`,
  responseHash: `0x${string}`,
  modelHash: `0x${string}`,
  timestamp: bigint,
  signature: `0x${string}`
): Promise<`0x${string}`> {
  if (!teeWalletClient) {
    throw new Error("TEE_SIGNER_PRIVATE_KEY not configured");
  }

  const hash = await teeWalletClient.writeContract({
    address: INFERENCE_GATEWAY_ADDRESS,
    abi: INFERENCE_GATEWAY_ABI,
    functionName: "submitProof",
    args: [user, promptHash, responseHash, modelHash, timestamp, signature],
  });

  await teePublicClient.waitForTransactionReceipt({ hash });

  return hash;
}
