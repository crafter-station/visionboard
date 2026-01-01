"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Link, RefreshCw, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Goal } from "@/components/goal-input";

interface MobileVisionCarouselProps {
  boardId?: string;
  goals: Goal[];
  onRegenerate?: (goalId: string) => void;
  onDeleteGoal?: (goalId: string) => void;
  onBack?: () => void;
}

export function MobileVisionCarousel({
  boardId,
  goals,
  onRegenerate,
  onDeleteGoal,
  onBack,
}: MobileVisionCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85 + 16;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(0, newIndex), goals.length - 1));
  }, [goals.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = container.offsetWidth * 0.85 + 16;
    container.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
  };

  const handleShare = async () => {
    if (!boardId) return;
    const url = `${window.location.origin}/board/${boardId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeGoal = goals[activeIndex];
  const allGenerated = goals.every((g) => g.generatedImageUrl && !g.isGenerating);
  const canRegenerate = activeGoal?.generatedImageUrl && !activeGoal?.isGenerating;

  return (
    <div className="w-full flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="size-10">
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <h2 className="text-base font-semibold">Your Vision Board</h2>
        </div>
        {boardId && allGenerated && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2 h-10"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copied
              </>
            ) : (
              <>
                <Link className="size-4" />
                Share
              </>
            )}
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full px-[7.5vw] gap-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="snap-center flex-shrink-0 w-[85vw] h-full flex items-center justify-center py-4"
            >
              <div 
                className="w-full h-full max-h-[70vh] shadow-lg"
                style={{ aspectRatio: "1618 / 2001" }}
              >
                <ImageCard
                  imageUrl={goal.generatedImageUrl}
                  phrase={goal.phrase}
                  isLoading={goal.isGenerating}
                  title={goal.title}
                />
              </div>
            </div>
          ))}
        </div>

        {goals.length > 1 && (
          <>
            <button
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center",
                "bg-background/80 backdrop-blur-sm rounded-full shadow-md",
                "transition-opacity",
                activeIndex === 0 && "opacity-30 pointer-events-none"
              )}
              disabled={activeIndex === 0}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => scrollToIndex(Math.min(goals.length - 1, activeIndex + 1))}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center",
                "bg-background/80 backdrop-blur-sm rounded-full shadow-md",
                "transition-opacity",
                activeIndex === goals.length - 1 && "opacity-30 pointer-events-none"
              )}
              disabled={activeIndex === goals.length - 1}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex justify-center gap-2 py-3 flex-shrink-0">
        {goals.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "size-2.5 rounded-full transition-all",
              index === activeIndex
                ? "bg-foreground scale-110"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {(onRegenerate || onDeleteGoal) && (
        <div className="flex gap-3 px-4 pb-4 pt-2 flex-shrink-0">
          {onRegenerate && (
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={() => onRegenerate(activeGoal.id)}
              disabled={!canRegenerate}
            >
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
          )}
          {onDeleteGoal && (
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={() => {
                if (confirm("Delete this goal?")) {
                  onDeleteGoal(activeGoal.id);
                }
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

