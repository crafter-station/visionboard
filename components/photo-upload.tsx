"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LOADING_MESSAGES = [
  "Convincing pixels to behave...",
  "Teaching AI about your future self...",
  "Calculating your 2026 potential...",
  "Removing excuses... I mean, background...",
  "Making you look goal-ready...",
  "Preparing your transformation...",
  "Finding your best angle...",
  "Getting the vision board vibes...",
];

interface PhotoUploadProps {
  visitorId: string | null;
  onUploadComplete: (data: {
    boardId: string;
    originalUrl: string;
    noBgUrl: string;
  }) => void;
}

export function PhotoUpload({ visitorId, onUploadComplete }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (!visitorId) {
      setError("Unable to verify identity. Please refresh the page.");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "x-visitor-id": visitorId },
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      setError(err.error || "Upload failed");
      setIsUploading(false);
      return;
    }

    const { url } = await uploadRes.json();

    setIsUploading(false);
    setIsProcessing(true);

    const bgRes = await fetch("/api/remove-background", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": visitorId,
      },
      body: JSON.stringify({ imageUrl: url }),
    });

    if (!bgRes.ok) {
      const err = await bgRes.json();
      setError(err.error || "Background removal failed");
      setIsProcessing(false);
      return;
    }

    const data = await bgRes.json();
    setIsProcessing(false);

    onUploadComplete(data);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [visitorId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
  };

  const isLoading = isUploading || isProcessing;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed transition-all duration-300 ease-out",
          "flex flex-col items-center justify-center p-8 min-h-[300px]",
          isDragging
            ? "border-foreground bg-accent/50"
            : "border-muted-foreground/30 hover:border-foreground/50",
          preview && "border-solid"
        )}
      >
        {preview ? (
          <div className="relative w-full h-full min-h-[250px]">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {!isLoading && (
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 p-1 bg-background/80 hover:bg-background transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin" />
                <span className="text-sm font-medium">
                  {isUploading ? "Uploading..." : loadingMessage}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="size-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Upload your photo</p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop or click to select
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>
      {error && (
        <p className="mt-4 text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
