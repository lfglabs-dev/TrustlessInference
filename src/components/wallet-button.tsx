"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { modal } from "@reown/appkit/react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push("/profile")}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => modal?.open()}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      Connect
    </Button>
  );
}
