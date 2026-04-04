"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  PAYMENT_GATEWAY_ADDRESS,
  PAYMENT_GATEWAY_ABI,
  USDT0_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";
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

    // Step 1: Approve
    setStep("approving");
    const approveTx = await writeContractAsync({
      address: USDT0_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PAYMENT_GATEWAY_ADDRESS, parsed],
    });
    setTxHash(approveTx);

    // Step 2: Deposit
    setStep("depositing");
    const depositTx = await writeContractAsync({
      address: PAYMENT_GATEWAY_ADDRESS,
      abi: PAYMENT_GATEWAY_ABI,
      functionName: "deposit",
      args: [parsed],
    });
    setTxHash(depositTx);
    setStep("idle");

    return depositTx;
  }

  return { deposit, step, isConfirming };
}
