"use client";

import { useReadContract } from "wagmi";
import {
  PAYMENT_GATEWAY_ADDRESS,
  PAYMENT_GATEWAY_ABI,
} from "@/lib/contracts";

export function useBalance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: PAYMENT_GATEWAY_ADDRESS,
    abi: PAYMENT_GATEWAY_ABI,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}
