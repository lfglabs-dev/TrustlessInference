"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import {
  INFERENCE_GATEWAY_ADDRESS,
  INFERENCE_GATEWAY_ABI,
  USDT0_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";
import { wagmiConfig } from "@/lib/wagmi";
import { parseUnits } from "viem";
import { useState } from "react";

export function useDeposit() {
  const [step, setStep] = useState<"idle" | "approving" | "depositing">("idle");
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function deposit(amount: string) {
    const parsed = parseUnits(amount, 6); // USDT has 6 decimals

    // Step 1: Approve and wait for confirmation
    setStep("approving");
    const approveTx = await writeContractAsync({
      address: USDT0_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [INFERENCE_GATEWAY_ADDRESS, parsed],
    });
    setTxHash(approveTx);
    await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });

    // Step 2: Deposit after approval is confirmed
    setStep("depositing");
    const depositTx = await writeContractAsync({
      address: INFERENCE_GATEWAY_ADDRESS,
      abi: INFERENCE_GATEWAY_ABI,
      functionName: "deposit",
      args: [parsed],
    });
    setTxHash(depositTx);
    setStep("idle");

    return depositTx;
  }

  return { deposit, step, isConfirming };
}
