"use client";

import { useReadContract } from "wagmi";
import {
  INFERENCE_GATEWAY_ADDRESS,
  INFERENCE_GATEWAY_ABI,
} from "@/lib/contracts";

export function useBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: INFERENCE_GATEWAY_ADDRESS,
    abi: INFERENCE_GATEWAY_ABI,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}
