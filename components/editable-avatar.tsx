"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const LOADING_MESSAGES = [
  "Convincing pixels to behave...",
  "Teaching AI about your future self...",
  "Removing excuses... I mean, background...",
  "Making you look goal-ready...",
  "Finding your best angle...",
];

interface EditableAvatarProps {
  src?: string;
  onAvatarChange?: (noBgUrl: string) => void;
  editable?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EditableAvatar({
  src,
  onAvatarChange,
  editable = false,
  size = "md",
  className,
}: EditableAvatarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setLoadingMessage(
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const sizeClasses = {
    sm: "size-8 sm:size-10",
    md: "size-10 sm:size-14",
    lg: "size-14 sm:size-20",
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await uploadRes.json();

      setIsUploading(false);
      setIsProcessing(true);

      const bgRes = await fetch("/api/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!bgRes.ok) {
        const err = await bgRes.json();
        throw new Error(err.error || "Background removal failed");
      }

      const data = await bgRes.json();
      setIsProcessing(false);

      onAvatarChange?.(data.noBgUrl);
      setIsDialogOpen(false);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClose = () => {
    if (isUploading || isProcessing) return;
    setIsDialogOpen(false);
    setPreview(null);
    setError(null);
  };

  const isLoading = isUploading || isProcessing;

  return (
    <>
      <button
        type="button"
        onClick={() => editable && setIsDialogOpen(true)}
        className={cn(
          "relative group overflow-hidden border-2 border-foreground bg-muted flex-shrink-0",
          "rounded-sm", // Square with slight rounding
          editable && "cursor-pointer",
          sizeClasses[size],
          className,
        )}
        disabled={!editable}
      >
        {src ? (
          <img
            src={src}
            alt="Your photo"
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="size-4 text-muted-foreground" />
          </div>
        )}

        {editable && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="size-4 text-white" />
          </div>
        )}
      </button>

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update your photo</DialogTitle>
          </DialogHeader>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-lg transition-all duration-200",
              "flex flex-col items-center justify-center p-6",
              "min-h-[250px]",
              isDragging
                ? "border-foreground bg-accent/50"
                : "border-muted-foreground/30 hover:border-foreground/50",
              preview && "border-solid border-muted",
            )}
          >
            {preview ? (
              <div className="relative w-full h-full min-h-[200px]">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain max-h-[250px]"
                />
                {!isLoading && (
                  <button
                    onClick={() => setPreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-background rounded-full transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
                {isLoading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3 rounded-lg">
                    <Loader2 className="size-8 animate-spin" />
                    <span className="text-sm font-medium text-center px-4">
                      {isUploading ? "Uploading..." : loadingMessage}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Camera className="size-10 text-muted-foreground mb-3" />
                <p className="text-base font-medium mb-1">Upload a new photo</p>
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Drag and drop or click to select
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

