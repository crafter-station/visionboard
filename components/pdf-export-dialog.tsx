"use client";

import { useState, useMemo } from "react";
import { FileDown, Loader2, Scissors, Grid2X2, Grid3X3, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PDFLayout = "2-col" | "3-col";
type PaperSize = "letter" | "a4";

interface PDFLayoutOption {
  id: PDFLayout;
  name: string;
  description: string;
  cols: number;
  rows: number;
  cardsPerPage: number;
}

const PDF_LAYOUTS: PDFLayoutOption[] = [
  { id: "2-col", name: "2 Columns", description: "4 cards per page, larger size", cols: 2, rows: 2, cardsPerPage: 4 },
  { id: "3-col", name: "3 Columns", description: "9 cards per page, compact size", cols: 3, rows: 3, cardsPerPage: 9 },
];

// Paper dimensions in mm
const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number; name: string; dimensions: string }> = {
  letter: { width: 215.9, height: 279.4, name: "Letter", dimensions: "8.5\" × 11\"" },
  a4: { width: 210, height: 297, name: "A4", dimensions: "210 × 297 mm" },
};

interface Goal {
  id: string;
  title: string;
  phrase?: string | null;
  generatedImageUrl?: string | null;
}

interface PDFExportDialogProps {
  boardId: string;
  goals: Goal[];
  trigger?: React.ReactNode;
}

const layoutIcons: Record<PDFLayout, React.ReactNode> = {
  "2-col": <Grid2X2 className="size-5" />,
  "3-col": <Grid3X3 className="size-5" />,
};

// Calculate card size to fit in grid cell while maintaining 3:4 aspect ratio
function calculateCardSize(paperSize: PaperSize, layout: PDFLayoutOption) {
  const paper = PAPER_DIMENSIONS[paperSize];
  const padding = 10; // mm
  const gap = 6; // mm
  
  const usableWidth = paper.width - (padding * 2);
  const usableHeight = paper.height - (padding * 2);
  
  const cellWidth = (usableWidth - (gap * (layout.cols - 1))) / layout.cols;
  const cellHeight = (usableHeight - (gap * (layout.rows - 1))) / layout.rows;
  
  // Card should fit in cell while maintaining 3:4 aspect ratio
  const cardAspectRatio = 3 / 4;
  
  let cardWidth = cellWidth;
  let cardHeight = cardWidth / cardAspectRatio;
  
  // If card is too tall for the cell, constrain by height
  if (cardHeight > cellHeight) {
    cardHeight = cellHeight;
    cardWidth = cardHeight * cardAspectRatio;
  }
  
  return { cardWidth, cardHeight, cellWidth, cellHeight };
}

export function PDFExportDialog({ boardId, goals, trigger }: PDFExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<PDFLayout>("2-col");
  const [selectedPaperSize, setSelectedPaperSize] = useState<PaperSize>("letter");
  const [showCutLines, setShowCutLines] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalsWithImages = goals.filter((g) => g.generatedImageUrl);
  const selectedLayoutInfo = PDF_LAYOUTS.find((l) => l.id === selectedLayout);
  const selectedPaperInfo = PAPER_DIMENSIONS[selectedPaperSize];
  const totalPages = selectedLayoutInfo
    ? Math.ceil(goalsWithImages.length / selectedLayoutInfo.cardsPerPage)
    : 0;

  // Calculate preview dimensions (scaled down for display)
  const previewScale = 0.5; // Scale factor for preview
  const previewDimensions = useMemo(() => {
    const paper = PAPER_DIMENSIONS[selectedPaperSize];
    const layout = selectedLayoutInfo;
    if (!layout) return null;
    
    const baseWidth = 120; // Base preview width in pixels
    const scale = baseWidth / paper.width;
    
    return {
      paperWidth: baseWidth,
      paperHeight: paper.height * scale,
      padding: 10 * scale,
      gap: 6 * scale,
      ...calculateCardSize(selectedPaperSize, layout),
      scale,
    };
  }, [selectedPaperSize, selectedLayoutInfo]);

  const handleExport = async () => {
    if (goalsWithImages.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          layout: selectedLayout,
          showCutLines,
          paperSize: selectedPaperSize,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vision-board-${selectedLayout}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FileDown className="size-4 mr-2" />
            Export PDF
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Generate a print-ready PDF. Perfect for printing and cutting out cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Layout Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Layout</p>
            <div className="grid grid-cols-2 gap-3">
              {PDF_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-md border transition-all",
                    selectedLayout === layout.id
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  <div
                    className={cn(
                      "text-muted-foreground",
                      selectedLayout === layout.id && "text-primary",
                    )}
                  >
                    {layoutIcons[layout.id]}
                  </div>
                  <span className="text-sm font-medium">{layout.name}</span>
                  <span className="text-xs text-muted-foreground">{layout.cardsPerPage} cards/page</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layout Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Preview</p>
            <div className="bg-muted/50 rounded-md p-4 flex justify-center">
              {previewDimensions && selectedLayoutInfo && (
                <div
                  className="bg-white border border-border shadow-sm relative"
                  style={{
                    width: previewDimensions.paperWidth,
                    height: previewDimensions.paperHeight,
                    padding: previewDimensions.padding,
                  }}
                >
                  <div
                    className="w-full h-full grid"
                    style={{
                      gridTemplateColumns: `repeat(${selectedLayoutInfo.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${selectedLayoutInfo.rows}, 1fr)`,
                      gap: previewDimensions.gap,
                    }}
                  >
                    {Array.from({ length: selectedLayoutInfo.cardsPerPage }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center"
                      >
                        <div
                          className={cn(
                            "bg-muted rounded-sm",
                            showCutLines && "border border-dashed border-muted-foreground/40",
                          )}
                          style={{
                            width: previewDimensions.cardWidth * previewDimensions.scale,
                            height: previewDimensions.cardHeight * previewDimensions.scale,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Paper Size */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Paper Size</p>
              <div className="flex gap-2">
                {Object.entries(PAPER_DIMENSIONS).map(([id, size]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedPaperSize(id as PaperSize)}
                    className={cn(
                      "flex-1 p-3 rounded-md border transition-all text-center",
                      selectedPaperSize === id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <p className="text-sm font-medium">{size.name}</p>
                    <p className="text-xs text-muted-foreground">{size.dimensions}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cut Lines Toggle */}
            <button
              type="button"
              onClick={() => setShowCutLines(!showCutLines)}
              className="w-full flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium">Cut lines</p>
                <p className="text-xs text-muted-foreground">
                  Show dashed lines for easier cutting
                </p>
              </div>
              <div
                className={cn(
                  "size-5 rounded border-2 flex items-center justify-center transition-colors",
                  showCutLines
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30",
                )}
              >
                {showCutLines && <Check className="size-3 text-primary-foreground" />}
              </div>
            </button>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cards to export</span>
              <span className="font-medium">{goalsWithImages.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total pages</span>
              <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paper size</span>
              <span className="font-medium">{selectedPaperInfo?.name}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isGenerating || goalsWithImages.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Scissors className="size-4 mr-2" />
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
