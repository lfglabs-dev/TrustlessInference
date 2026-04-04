import { createPublicClient, http } from "viem";
import {
  INFERENCE_GATEWAY_ABI,
  INFERENCE_GATEWAY_ADDRESS,
} from "@/lib/contracts";
import { NextRequest } from "next/server";

const viemClient = createPublicClient({
  transport: http("https://coston2-api.flare.network/ext/C/rpc"),
});

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return Response.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const balance = await viemClient.readContract({
      address: INFERENCE_GATEWAY_ADDRESS,
      abi: INFERENCE_GATEWAY_ABI,
      functionName: "balances",
      args: [address as `0x${string}`],
    });

    return Response.json({
      balance: balance.toString(),
      currency: "USDT0",
    });
  } catch {
    return Response.json({
      balance: "0",
      currency: "USDT0",
    });
  }
}
