"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const LOADING_MESSAGES = [
  "Manifesting your future...",
  "Putting you in the spotlight...",
  "Making dreams pixel-perfect...",
  "2026 is looking good...",
  "Creating your success story...",
  "Visualizing greatness...",
  "Adding a dash of ambition...",
  "Your goals are loading...",
  "Future you says hi...",
  "Building your vision...",
];

// Frame decoration types
type FrameStyle = "tape" | "tape-corner" | "pin" | "clip" | "washi" | "double-tape";

const TAPE_COLORS = [
  { bg: "bg-yellow-100", border: "border-yellow-200" },
  { bg: "bg-pink-100", border: "border-pink-200" },
  { bg: "bg-blue-100", border: "border-blue-200" },
  { bg: "bg-green-100", border: "border-green-200" },
  { bg: "bg-orange-100", border: "border-orange-200" },
  { bg: "bg-purple-100", border: "border-purple-200" },
];

const WASHI_PATTERNS = [
  "bg-gradient-to-r from-pink-200 via-pink-100 to-pink-200",
  "bg-gradient-to-r from-blue-200 via-blue-100 to-blue-200",
  "bg-gradient-to-r from-yellow-200 via-yellow-100 to-yellow-200",
  "bg-[repeating-linear-gradient(45deg,theme(colors.pink.100),theme(colors.pink.100)_2px,theme(colors.white)_2px,theme(colors.white)_4px)]",
  "bg-[repeating-linear-gradient(90deg,theme(colors.blue.100),theme(colors.blue.100)_2px,theme(colors.white)_2px,theme(colors.white)_4px)]",
];

// Polaroid paper/frame variations
const FRAME_PAPERS = [
  { bg: "bg-white", border: "border-gray-200", name: "classic" },
  { bg: "bg-amber-50", border: "border-amber-100", name: "vintage" },
  { bg: "bg-stone-50", border: "border-stone-200", name: "aged" },
  { bg: "bg-slate-50", border: "border-slate-200", name: "cool" },
  { bg: "bg-rose-50", border: "border-rose-100", name: "warm" },
  { bg: "bg-sky-50", border: "border-sky-100", name: "fresh" },
  { bg: "bg-lime-50", border: "border-lime-100", name: "spring" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-100", name: "pop" },
];

// Frame edge effects
const FRAME_EDGES = [
  "shadow-2xl", // standard deep shadow
  "shadow-xl shadow-black/20", // darker shadow
  "shadow-lg ring-1 ring-black/5", // subtle ring
  "shadow-2xl shadow-amber-900/10", // warm shadow
  "shadow-2xl shadow-slate-900/15", // cool shadow
];

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000) / 1000;
}

function getFrameStyle(id: string): {
  style: FrameStyle;
  tapeColor: (typeof TAPE_COLORS)[number];
  washiPattern: string;
  tapeRotation: number;
  paper: (typeof FRAME_PAPERS)[number];
  edge: string;
  hasAging: boolean;
} {
  const rand = seededRandom(id);
  const styles: FrameStyle[] = ["tape", "tape-corner", "pin", "clip", "washi", "double-tape"];
  const styleIndex = Math.floor(rand * styles.length);
  const tapeIndex = Math.floor(seededRandom(id + "tape") * TAPE_COLORS.length);
  const washiIndex = Math.floor(seededRandom(id + "washi") * WASHI_PATTERNS.length);
  const tapeRotation = (seededRandom(id + "rot") - 0.5) * 30;
  const paperIndex = Math.floor(seededRandom(id + "paper") * FRAME_PAPERS.length);
  const edgeIndex = Math.floor(seededRandom(id + "edge") * FRAME_EDGES.length);
  const hasAging = seededRandom(id + "age") > 0.6; // 40% chance of aging effect

  return {
    style: styles[styleIndex],
    tapeColor: TAPE_COLORS[tapeIndex],
    washiPattern: WASHI_PATTERNS[washiIndex],
    tapeRotation,
    paper: FRAME_PAPERS[paperIndex],
    edge: FRAME_EDGES[edgeIndex],
    hasAging,
  };
}

interface ImageCardProps {
  imageUrl?: string;
  phrase?: string;
  isLoading?: boolean;
  title: string;
  rotation?: number;
  className?: string;
  id?: string;
}

export function ImageCard({
  imageUrl,
  phrase,
  isLoading,
  title,
  rotation = 0,
  className,
  id = "default",
}: ImageCardProps) {
  const [loadingMessage, setLoadingMessage] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
  );

  const frameConfig = useMemo(() => getFrameStyle(id), [id]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessage(
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className={cn("relative w-full h-full overflow-hidden", className)}>
        <Skeleton className="absolute inset-0" />
        <div className="absolute inset-0 animate-border-beam" />
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  const { style, tapeColor, washiPattern, tapeRotation, paper, edge, hasAging } = frameConfig;

  const renderDecoration = () => {
    switch (style) {
      case "tape":
        return (
          <div
            className={cn(
              "absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-5 sm:w-16 sm:h-6 opacity-70 rounded-sm border shadow-sm",
              tapeColor.bg,
              tapeColor.border,
            )}
            style={{ transform: `translateX(-50%) rotate(${tapeRotation}deg)` }}
          />
        );

      case "tape-corner":
        return (
          <>
            <div
              className={cn(
                "absolute -top-1 -left-1 w-8 h-4 sm:w-10 sm:h-5 opacity-70 rounded-sm border shadow-sm",
                tapeColor.bg,
                tapeColor.border,
              )}
              style={{ transform: "rotate(-45deg)" }}
            />
            <div
              className={cn(
                "absolute -top-1 -right-1 w-8 h-4 sm:w-10 sm:h-5 opacity-70 rounded-sm border shadow-sm",
                tapeColor.bg,
                tapeColor.border,
              )}
              style={{ transform: "rotate(45deg)" }}
            />
          </>
        );

      case "pin":
        return (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 shadow-md border-2 border-red-600" />
            <div className="w-0.5 h-2 bg-gray-400 -mt-0.5" />
          </div>
        );

      case "clip":
        return (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-6 h-8 sm:w-8 sm:h-10 border-2 border-gray-400 rounded-t-full bg-transparent" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 rounded-full bg-white" />
          </div>
        );

      case "washi":
        return (
          <div
            className={cn(
              "absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-5 sm:w-20 sm:h-6 opacity-80 rounded-none",
              washiPattern,
            )}
            style={{
              transform: `translateX(-50%) rotate(${tapeRotation}deg)`,
              clipPath: "polygon(2% 0%, 98% 0%, 100% 100%, 0% 100%)",
            }}
          />
        );

      case "double-tape":
        return (
          <>
            <div
              className={cn(
                "absolute -top-2 left-4 sm:left-6 w-10 h-4 sm:w-12 sm:h-5 opacity-60 rounded-sm border shadow-sm",
                tapeColor.bg,
                tapeColor.border,
              )}
              style={{ transform: `rotate(${-15 + tapeRotation}deg)` }}
            />
            <div
              className={cn(
                "absolute -top-2 right-4 sm:right-6 w-10 h-4 sm:w-12 sm:h-5 opacity-60 rounded-sm border shadow-sm",
                TAPE_COLORS[(TAPE_COLORS.indexOf(tapeColor) + 1) % TAPE_COLORS.length].bg,
                TAPE_COLORS[(TAPE_COLORS.indexOf(tapeColor) + 1) % TAPE_COLORS.length].border,
              )}
              style={{ transform: `rotate(${15 + tapeRotation}deg)` }}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "group relative inline-block w-full h-full",
        "transform transition-all duration-300 ease-out",
        "hover:scale-105",
        className,
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Polaroid Card */}
      <div
        className={cn(
          "p-3 pb-12 sm:p-4 sm:pb-16 rounded-sm border relative h-full flex flex-col",
          paper.bg,
          paper.border,
          edge,
        )}
      >
        {/* Frame decoration */}
        {renderDecoration()}

        {/* Image Container */}
        <div className="relative overflow-hidden bg-gray-100 rounded-sm flex-1 min-h-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-all duration-300 group-hover:brightness-110"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <p className="text-xs text-muted-foreground text-center px-2">
                {title}
              </p>
            </div>
          )}
        </div>

        {/* Caption/Phrase */}
        {(phrase || title) && (
          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
            <p className="text-gray-700 text-xs sm:text-sm font-medium text-center leading-relaxed line-clamp-2">
              {phrase || title}
            </p>
          </div>
        )}

        {/* Aging/vintage overlay effect */}
        {hasAging && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-amber-100/20 pointer-events-none rounded-sm" />
        )}

        {/* Paper texture overlay */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] pointer-events-none rounded-sm" />
      </div>

      {/* Multiple shadow layers for depth */}
      <div className="absolute inset-0 bg-black/5 rounded-sm transform translate-x-1 translate-y-1 -z-10 transition-all duration-300 group-hover:translate-x-2 group-hover:translate-y-2" />
      <div className="absolute inset-0 bg-black/3 rounded-sm transform translate-x-2 translate-y-2 -z-20" />
    </div>
  );
}
