"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
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
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            {JSON.stringify(attestation, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
