import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateAttestation, computeModelHash } from "@/lib/tee";
import { createPublicClient, http } from "viem";
import { MODEL_REGISTRY_ABI, MODEL_REGISTRY_ADDRESS } from "@/lib/contracts";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const viemClient = createPublicClient({
  transport: http("https://coston2-api.flare.network/ext/C/rpc"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const model: string = body.model ?? "anthropic/claude-opus-4.6";
  const userAddress: string = body.userAddress ?? "0x0";

  // Model verification: check on-chain registry
  let onChainHash: string;
  try {
    onChainHash = (await viemClient.readContract({
      address: MODEL_REGISTRY_ADDRESS,
      abi: MODEL_REGISTRY_ABI,
      functionName: "getModelHash",
      args: [model],
    })) as string;
  } catch {
    // If contract not deployed, use computed hash for demo
    onChainHash = computeModelHash(model);
  }

  const expectedHash = computeModelHash(model);
  const zeroHash =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  if (onChainHash === zeroHash) {
    return Response.json({ error: "Model not registered" }, { status: 400 });
  }

  // Build prompt string for attestation
  const lastUserMessage = messages.filter((m) => m.role === "user").pop();
  const promptText = lastUserMessage
    ? lastUserMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? ""
    : "";

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: openrouter(model),
          messages: messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content:
              m.parts
                ?.filter(
                  (p): p is { type: "text"; text: string } => p.type === "text"
                )
                .map((p) => p.text)
                .join("") ?? "",
          })),
          onFinish({ text }) {
            const attestation = generateAttestation(
              promptText,
              text,
              onChainHash
            );
            // Write attestation as a data part
            writer.write({
              type: "data-attestation",
              data: attestation,
            } as never);
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    }),
  });
}
