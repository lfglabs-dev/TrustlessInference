"use client";

import { useAccount } from "wagmi";
import { useBalance } from "@/hooks/use-balance";
import { useDeposit } from "@/hooks/use-deposit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpRight } from "lucide-react";
import { UsdtIcon } from "@/components/icons/usdt-icon";
import { useState } from "react";
import { formatUnits } from "viem";
import { toast } from "sonner";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch } = useBalance(address);
  const { deposit, step, isConfirming } = useDeposit();
  const [amount, setAmount] = useState("");

  const formattedBalance = balance ? formatUnits(balance, 6) : "0";

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      await deposit(amount);
      toast.success("Deposit successful");
      setAmount("");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Deposit failed"
      );
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Connect your wallet</p>
            <p className="text-sm text-muted-foreground">
              Connect your wallet to view your balance and make deposits.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your balance and view transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <code className="text-sm">
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </code>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              USDT0 Balance
            </span>
            <div className="flex items-center gap-2">
              <UsdtIcon />
              <span className="text-2xl font-bold">{formattedBalance}</span>
              <Badge variant="secondary">USDT0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Up</CardTitle>
          <CardDescription>
            Deposit USDT0 to your inference balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDeposit} className="flex gap-3">
            <Input
              type="number"
              placeholder="Amount"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              type="submit"
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                step !== "idle" ||
                isConfirming
              }
            >
              {step === "approving"
                ? "Approving..."
                : step === "depositing"
                  ? "Depositing..."
                  : isConfirming
                    ? "Confirming..."
                    : "Deposit"}
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
