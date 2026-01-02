"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  credits?: number;
  className?: string;
}

export function ProBadge({ credits, className }: ProBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30",
        className,
      )}
    >
      <Crown className="size-3.5 text-amber-500" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Pro
      </span>
      {credits !== undefined && (
        <span className="text-xs text-muted-foreground">{credits} left</span>
      )}
    </div>
  );
}
