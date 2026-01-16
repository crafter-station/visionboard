import { notFound } from "next/navigation";
import { getVisionBoard } from "@/db/queries/boards";
import { PrintableCard } from "@/components/printable-card";

type PDFLayout = "2-col" | "3-col";
type PaperSize = "letter" | "a4";

interface LayoutConfig {
  cols: number;
  rows: number;
  cardsPerPage: number;
}

const LAYOUTS: Record<PDFLayout, LayoutConfig> = {
  "2-col": { cols: 2, rows: 2, cardsPerPage: 4 },
  "3-col": { cols: 3, rows: 3, cardsPerPage: 9 },
};

// Paper dimensions in mm
const PAPER_SIZES: Record<PaperSize, { width: number; height: number }> = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 },
};

const PADDING = 10; // mm
const GAP = 6; // mm

// Calculate card size to fit in grid cell while maintaining 3:4 aspect ratio
function calculateCardSize(paperSize: PaperSize, layout: LayoutConfig) {
  const paper = PAPER_SIZES[paperSize];
  
  const usableWidth = paper.width - (PADDING * 2);
  const usableHeight = paper.height - (PADDING * 2);
  
  const cellWidth = (usableWidth - (GAP * (layout.cols - 1))) / layout.cols;
  const cellHeight = (usableHeight - (GAP * (layout.rows - 1))) / layout.rows;
  
  // Card should fit in cell while maintaining 3:4 aspect ratio
  const cardAspectRatio = 3 / 4;
  
  let cardWidth = cellWidth;
  let cardHeight = cardWidth / cardAspectRatio;
  
  // If card is too tall for the cell, constrain by height
  if (cardHeight > cellHeight) {
    cardHeight = cellHeight;
    cardWidth = cardHeight * cardAspectRatio;
  }
  
  return { cardWidth, cardHeight };
}

interface PageProps {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{
    layout?: string;
    showCutLines?: string;
    paperSize?: string;
  }>;
}

export default async function PrintPage({ params, searchParams }: PageProps) {
  const { boardId } = await params;
  const { layout: layoutParam, showCutLines: showCutLinesParam, paperSize: paperSizeParam } = await searchParams;

  const board = await getVisionBoard(boardId);
  if (!board) {
    notFound();
  }

  const goalsWithImages = board.goals.filter((g) => g.generatedImageUrl);
  if (goalsWithImages.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6b7280" }}>No images to export</p>
      </div>
    );
  }

  const paperSizeKey = (paperSizeParam as PaperSize) || "letter";
  const layoutKey = (layoutParam as PDFLayout) || "2-col";
  const layout = LAYOUTS[layoutKey] || LAYOUTS["2-col"];
  const showCutLines = showCutLinesParam === "true";
  const paper = PAPER_SIZES[paperSizeKey];
  const cardSize = calculateCardSize(paperSizeKey, layout);

  // Split goals into pages
  const pages: typeof goalsWithImages[] = [];
  for (let i = 0; i < goalsWithImages.length; i += layout.cardsPerPage) {
    pages.push(goalsWithImages.slice(i, i + layout.cardsPerPage));
  }

  return (
    <html>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: ${paper.width}mm ${paper.height}mm;
                margin: 0;
              }

              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }

              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                background: white;
              }

              .print-page {
                width: ${paper.width}mm;
                height: ${paper.height}mm;
                padding: ${PADDING}mm;
                page-break-after: always;
                background: white;
              }

              .print-page:last-child {
                page-break-after: auto;
              }

              .print-grid {
                display: grid;
                grid-template-columns: repeat(${layout.cols}, 1fr);
                grid-template-rows: repeat(${layout.rows}, 1fr);
                gap: ${GAP}mm;
                width: 100%;
                height: 100%;
              }

              .card-slot {
                display: flex;
                align-items: center;
                justify-content: center;
              }

              /* Printable Card Styles - Fixed size based on paper */
              .printable-card-wrapper {
                position: relative;
                width: ${cardSize.cardWidth}mm;
                height: ${cardSize.cardHeight}mm;
              }

              .cut-lines {
                position: absolute;
                inset: -2mm;
                border: 1px dashed #d1d5db;
                border-radius: 2px;
                pointer-events: none;
              }

              .polaroid-card {
                position: absolute;
                inset: 0;
                padding: 3mm;
                padding-bottom: 10mm;
                border-radius: 2px;
                border: 1px solid;
                display: flex;
                flex-direction: column;
                box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.06);
              }

              .image-container {
                position: relative;
                flex: 1;
                overflow: hidden;
                background: #f3f4f6;
                border-radius: 1px;
              }

              .card-image {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .caption {
                position: absolute;
                bottom: 2mm;
                left: 3mm;
                right: 3mm;
              }

              .caption-text {
                color: #374151;
                font-size: ${layout.cols === 3 ? '7pt' : '9pt'};
                font-weight: 500;
                text-align: center;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }

              .aging-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(to bottom right, rgba(255,251,235,0.3), transparent, rgba(254,243,199,0.2));
                pointer-events: none;
                border-radius: 2px;
              }

              /* Decorations - scaled based on layout */
              .absolute { position: absolute; }
              .relative { position: relative; }
              .flex { display: flex; }
              .flex-col { flex-direction: column; }
              .items-center { align-items: center; }
              .transform { transform: var(--transform); }
              
              /* Decoration sizes - smaller for 3-col */
              .-top-1 { top: ${layout.cols === 3 ? '-0.8mm' : '-1mm'}; }
              .-top-2 { top: ${layout.cols === 3 ? '-1.5mm' : '-2mm'}; }
              .-top-3 { top: ${layout.cols === 3 ? '-2mm' : '-3mm'}; }
              .-top-4 { top: ${layout.cols === 3 ? '-2.5mm' : '-4mm'}; }
              .-left-1 { left: ${layout.cols === 3 ? '-0.8mm' : '-1mm'}; }
              .-right-1 { right: ${layout.cols === 3 ? '-0.8mm' : '-1mm'}; }
              .top-2 { top: ${layout.cols === 3 ? '1.5mm' : '2mm'}; }
              .left-6 { left: ${layout.cols === 3 ? '4mm' : '6mm'}; }
              .right-6 { right: ${layout.cols === 3 ? '4mm' : '6mm'}; }
              .left-1\\/2 { left: 50%; }
              .-translate-x-1\\/2 { transform: translateX(-50%); }
              .-mt-0\\.5 { margin-top: -0.5mm; }

              .w-0\\.5 { width: 0.5mm; }
              .w-4 { width: ${layout.cols === 3 ? '3mm' : '4mm'}; }
              .w-5 { width: ${layout.cols === 3 ? '3.5mm' : '5mm'}; }
              .w-8 { width: ${layout.cols === 3 ? '5mm' : '8mm'}; }
              .w-10 { width: ${layout.cols === 3 ? '6mm' : '10mm'}; }
              .w-12 { width: ${layout.cols === 3 ? '8mm' : '12mm'}; }
              .w-16 { width: ${layout.cols === 3 ? '10mm' : '16mm'}; }
              .w-20 { width: ${layout.cols === 3 ? '12mm' : '20mm'}; }
              .h-2 { height: ${layout.cols === 3 ? '1.5mm' : '2mm'}; }
              .h-4 { height: ${layout.cols === 3 ? '3mm' : '4mm'}; }
              .h-5 { height: ${layout.cols === 3 ? '3.5mm' : '5mm'}; }
              .h-6 { height: ${layout.cols === 3 ? '4mm' : '6mm'}; }
              .h-10 { height: ${layout.cols === 3 ? '6mm' : '10mm'}; }

              .rounded-sm { border-radius: 1mm; }
              .rounded-full { border-radius: 9999px; }
              .rounded-t-full { border-top-left-radius: 9999px; border-top-right-radius: 9999px; }
              .rounded-none { border-radius: 0; }
              .border { border-width: 1px; border-style: solid; }
              .border-2 { border-width: ${layout.cols === 3 ? '1.5px' : '2px'}; border-style: solid; }

              .opacity-60 { opacity: 0.6; }
              .opacity-70 { opacity: 0.7; }
              .opacity-80 { opacity: 0.8; }

              /* Paper backgrounds */
              .bg-white { background-color: #ffffff; }
              .bg-amber-50 { background-color: #fffbeb; }
              .bg-stone-50 { background-color: #fafaf9; }
              .bg-slate-50 { background-color: #f8fafc; }
              .bg-rose-50 { background-color: #fff1f2; }
              .bg-sky-50 { background-color: #f0f9ff; }
              .bg-lime-50 { background-color: #f7fee7; }
              .bg-fuchsia-50 { background-color: #fdf4ff; }
              .bg-transparent { background-color: transparent; }
              .bg-gray-400 { background-color: #9ca3af; }
              .bg-red-500 { background-color: #ef4444; }

              /* Tape colors */
              .bg-yellow-100 { background-color: #fef9c3; }
              .bg-pink-100 { background-color: #fce7f3; }
              .bg-blue-100 { background-color: #dbeafe; }
              .bg-green-100 { background-color: #dcfce7; }
              .bg-orange-100 { background-color: #ffedd5; }
              .bg-purple-100 { background-color: #f3e8ff; }
              .bg-pink-200 { background-color: #fbcfe8; }
              .bg-blue-200 { background-color: #bfdbfe; }
              .bg-yellow-200 { background-color: #fef08a; }

              /* Border colors */
              .border-gray-200 { border-color: #e5e7eb; }
              .border-gray-400 { border-color: #9ca3af; }
              .border-amber-100 { border-color: #fef3c7; }
              .border-stone-200 { border-color: #e7e5e4; }
              .border-slate-200 { border-color: #e2e8f0; }
              .border-rose-100 { border-color: #ffe4e6; }
              .border-sky-100 { border-color: #e0f2fe; }
              .border-lime-100 { border-color: #ecfccb; }
              .border-fuchsia-100 { border-color: #fae8ff; }
              .border-yellow-200 { border-color: #fef08a; }
              .border-pink-200 { border-color: #fbcfe8; }
              .border-blue-200 { border-color: #bfdbfe; }
              .border-green-200 { border-color: #bbf7d0; }
              .border-orange-200 { border-color: #fed7aa; }
              .border-purple-200 { border-color: #e9d5ff; }
              .border-red-600 { border-color: #dc2626; }

              /* Gradients for washi tape */
              .bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
              .from-pink-200 { --tw-gradient-from: #fbcfe8; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(251 207 232 / 0)); }
              .via-pink-100 { --tw-gradient-stops: var(--tw-gradient-from), #fce7f3, var(--tw-gradient-to, rgb(252 231 243 / 0)); }
              .to-pink-200 { --tw-gradient-to: #fbcfe8; }
              .from-blue-200 { --tw-gradient-from: #bfdbfe; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(191 219 254 / 0)); }
              .via-blue-100 { --tw-gradient-stops: var(--tw-gradient-from), #dbeafe, var(--tw-gradient-to, rgb(219 234 254 / 0)); }
              .to-blue-200 { --tw-gradient-to: #bfdbfe; }
              .from-yellow-200 { --tw-gradient-from: #fef08a; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgb(254 240 138 / 0)); }
              .via-yellow-100 { --tw-gradient-stops: var(--tw-gradient-from), #fef9c3, var(--tw-gradient-to, rgb(254 249 195 / 0)); }
              .to-yellow-200 { --tw-gradient-to: #fef08a; }

              @media print {
                html, body {
                  width: ${paper.width}mm;
                  height: auto;
                }
              }
            `,
          }}
        />
      </head>
      <body>
        {pages.map((pageGoals, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <div className="print-grid">
              {pageGoals.map((goal) => (
                <div key={goal.id} className="card-slot">
                  <PrintableCard
                    id={goal.id}
                    imageUrl={goal.generatedImageUrl!}
                    title={goal.title}
                    phrase={goal.phrase ?? undefined}
                    showCutLines={showCutLines}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
