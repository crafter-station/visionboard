"use client";

import { useEffect, useState } from "react";
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

interface ImageCardProps {
  imageUrl?: string;
  phrase?: string;
  isLoading?: boolean;
  title: string;
}

const FRAME = {
  width: 1618,
  height: 2001,
  photo: {
    width: 1343,
    height: 1278,
    left: 142,
    top: 191,
  },
  text: {
    width: 1247,
    height: 250,
    top: 1614,
  },
};

export function ImageCard({ imageUrl, phrase, isLoading, title }: ImageCardProps) {
  const [loadingMessage, setLoadingMessage] = useState(() =>
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <Skeleton className="absolute inset-0" />
        <div className="absolute inset-0 animate-border-beam" />
        <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-card">
      <div
        className="absolute inset-0"
        style={{
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
        }}
      >
        <img
          src="/frames/frame-7.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
          draggable={false}
        />

        {imageUrl ? (
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${(FRAME.photo.left / FRAME.width) * 100}%`,
              top: `${(FRAME.photo.top / FRAME.height) * 100}%`,
              width: `${(FRAME.photo.width / FRAME.width) * 100}%`,
              height: `${(FRAME.photo.height / FRAME.height) * 100}%`,
            }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <div
            className="absolute flex items-center justify-center bg-muted/50"
            style={{
              left: `${(FRAME.photo.left / FRAME.width) * 100}%`,
              top: `${(FRAME.photo.top / FRAME.height) * 100}%`,
              width: `${(FRAME.photo.width / FRAME.width) * 100}%`,
              height: `${(FRAME.photo.height / FRAME.height) * 100}%`,
            }}
          >
            <p className="text-xs text-muted-foreground text-center px-2">
              {title}
            </p>
          </div>
        )}

        {phrase && (
          <div
            className="absolute flex items-center justify-center z-20"
            style={{
              left: `${((FRAME.width - FRAME.text.width) / 2 / FRAME.width) * 100}%`,
              top: `${(FRAME.text.top / FRAME.height) * 100}%`,
              width: `${(FRAME.text.width / FRAME.width) * 100}%`,
              height: `${(FRAME.text.height / FRAME.height) * 100}%`,
            }}
          >
            <p className="text-center font-medium text-[0.5em] sm:text-[0.6em] md:text-[0.7em] leading-tight px-1 text-black">
              {phrase}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
