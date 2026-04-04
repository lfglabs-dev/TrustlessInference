"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { useModel } from "./model-context";
import { TeeStatus } from "./tee-status";
import { AttestationCard } from "./attestation-card";
import type { Attestation } from "@/lib/tee";

export function ChatPanel() {
  const { model } = useModel();
  const [teeStep, setTeeStep] = useState(-1);
  const [input, setInput] = useState("");
  const { address } = useAccount();
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { model, userAddress: address ?? "0x0" },
      }),
    [model, address]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    onFinish() {
      setTeeStep(4);
      setTimeout(() => setTeeStep(-1), 2000);
    },
    onError() {
      setTeeStep(-1);
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Extract attestations from message data parts
  const attestations: Record<string, Attestation> = {};
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (part.type === "data-attestation") {
        attestations[msg.id] = (part as { type: string; data: Attestation }).data;
      }
    }
  }

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      setTeeStep(0);
      setTimeout(() => setTeeStep(1), 400);
      setTimeout(() => setTeeStep(2), 900);
      const text = input;
      setInput("");
      await sendMessage({ text });
    },
    [input, isLoading, sendMessage]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit(e);
      }
    },
    [onSubmit]
  );

  return (
    <div className="flex flex-1 flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="mx-auto max-w-2xl space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">Verifiable AI Inference</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a model and send a message. Every response is attested by
                a mocked TEE.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage message={msg} />
              {msg.role === "assistant" && attestations[msg.id] && (
                <div className="ml-11 mb-2">
                  <AttestationCard attestation={attestations[msg.id]} />
                </div>
              )}
            </div>
          ))}
          {isLoading && <TeeStatus activeStep={teeStep} />}
        </div>
      </ScrollArea>

      <form onSubmit={onSubmit} className="border-t p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="min-h-[44px] max-h-[120px] resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
