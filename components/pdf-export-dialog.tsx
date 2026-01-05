"use client";

import { useState } from "react";
import { FileDown, Loader2, Scissors, Grid2X2, Grid3X3, LayoutGrid, Square, Check } from "lucide-react";
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
import {
  generateVisionBoardPDF,
  PDF_LAYOUTS,
  type PDFLayout,
} from "@/lib/pdf-generator";

interface Goal {
  id: string;
  title: string;
  phrase?: string | null;
  generatedImageUrl?: string | null;
}

interface PDFExportDialogProps {
  goals: Goal[];
  trigger?: React.ReactNode;
}

const layoutIcons: Record<PDFLayout, React.ReactNode> = {
  "2x2": <Grid2X2 className="size-5" />,
  "2x3": <LayoutGrid className="size-5" />,
  "3x3": <Grid3X3 className="size-5" />,
  "1x2": (
    <div className="flex flex-col gap-0.5">
      <div className="w-5 h-2 bg-current rounded-sm" />
      <div className="w-5 h-2 bg-current rounded-sm" />
    </div>
  ),
  full: <Square className="size-5" />,
};

export function PDFExportDialog({ goals, trigger }: PDFExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<PDFLayout>("2x3");
  const [showCutLines, setShowCutLines] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const goalsWithImages = goals.filter((g) => g.generatedImageUrl);
  const selectedLayoutInfo = PDF_LAYOUTS.find((l) => l.id === selectedLayout);
  const totalPages = selectedLayoutInfo
    ? Math.ceil(goalsWithImages.length / selectedLayoutInfo.cardsPerPage)
    : 0;

  const handleExport = async () => {
    if (goalsWithImages.length === 0) return;

    setIsGenerating(true);
    setProgress({ current: 0, total: goalsWithImages.length });

    try {
      await generateVisionBoardPDF(
        goals,
        selectedLayout,
        showCutLines,
        (current, total) => setProgress({ current, total }),
      );
      setOpen(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0 });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
          <DialogDescription>
            Generate a print-ready PDF with your vision board images. Choose a
            layout that works best for your printing needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Layout Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Layout</p>
            <div className="grid grid-cols-5 gap-2">
              {PDF_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayout(layout.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
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
                  <span className="text-xs font-medium">{layout.name}</span>
                </button>
              ))}
            </div>
            {selectedLayoutInfo && (
              <p className="text-xs text-muted-foreground">
                {selectedLayoutInfo.description} •{" "}
                {selectedLayoutInfo.cardsPerPage} cards per page
              </p>
            )}
          </div>

          {/* Layout Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Preview</p>
            <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
              <div
                className="bg-white border border-border shadow-sm relative"
                style={{
                  width: 120,
                  height: 155,
                }}
              >
                {selectedLayoutInfo && (
                  <div
                    className="absolute inset-2 grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${selectedLayoutInfo.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${selectedLayoutInfo.rows}, 1fr)`,
                    }}
                  >
                    {Array.from({
                      length: selectedLayoutInfo.cardsPerPage,
                    }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "bg-muted rounded-sm border",
                          showCutLines && "border-dashed border-muted-foreground/40",
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowCutLines(!showCutLines)}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
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
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Images to export</span>
              <span className="font-medium">{goalsWithImages.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total pages</span>
              <span className="font-medium">{totalPages}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paper size</span>
              <span className="font-medium">Letter (8.5" × 11")</span>
            </div>
          </div>
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
                {progress.total > 0
                  ? `Processing ${progress.current}/${progress.total}...`
                  : "Generating..."}
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

