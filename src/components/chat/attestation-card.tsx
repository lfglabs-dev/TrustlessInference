"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ShieldCheck, ExternalLink } from "lucide-react";
import type { Attestation } from "@/lib/tee";

interface AttestationCardProps {
  attestation: Attestation;
}

export function AttestationCard({ attestation }: AttestationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between p-0 h-auto hover:bg-transparent"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <Badge
              variant="outline"
              className="border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
            >
              Verified
            </Badge>
            {attestation.tx_hash && (
              <Badge
                variant="outline"
                className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                On-Chain
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              TEE Attestation
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {expanded && (
          <div className="mt-3 space-y-2">
            {attestation.tx_hash && (
              <a
                href={`https://coston2-explorer.flare.network/tx/${attestation.tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                View on-chain proof
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
              {JSON.stringify(attestation, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
