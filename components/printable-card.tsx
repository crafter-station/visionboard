import { cn } from "@/lib/utils";

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

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000) / 1000;
}

function getFrameStyle(id: string) {
  const rand = seededRandom(id);
  const styles: FrameStyle[] = ["tape", "tape-corner", "pin", "clip", "washi", "double-tape"];
  const styleIndex = Math.floor(rand * styles.length);
  const tapeIndex = Math.floor(seededRandom(id + "tape") * TAPE_COLORS.length);
  const washiIndex = Math.floor(seededRandom(id + "washi") * WASHI_PATTERNS.length);
  const tapeRotation = (seededRandom(id + "rot") - 0.5) * 30;
  const paperIndex = Math.floor(seededRandom(id + "paper") * FRAME_PAPERS.length);
  const hasAging = seededRandom(id + "age") > 0.6;

  return {
    style: styles[styleIndex],
    tapeColor: TAPE_COLORS[tapeIndex],
    washiPattern: WASHI_PATTERNS[washiIndex],
    tapeRotation,
    paper: FRAME_PAPERS[paperIndex],
    hasAging,
  };
}

interface PrintableCardProps {
  imageUrl: string;
  phrase?: string;
  title: string;
  id: string;
  showCutLines?: boolean;
}

export function PrintableCard({
  imageUrl,
  phrase,
  title,
  id,
  showCutLines = false,
}: PrintableCardProps) {
  const { style, tapeColor, washiPattern, tapeRotation, paper, hasAging } = getFrameStyle(id);

  const renderDecoration = () => {
    switch (style) {
      case "tape":
        return (
          <div
            className={cn(
              "absolute -top-2 left-1/2 w-16 h-6 opacity-70 rounded-sm border",
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
                "absolute -top-1 -left-1 w-10 h-5 opacity-70 rounded-sm border",
                tapeColor.bg,
                tapeColor.border,
              )}
              style={{ transform: "rotate(-45deg)" }}
            />
            <div
              className={cn(
                "absolute -top-1 -right-1 w-10 h-5 opacity-70 rounded-sm border",
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
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-red-600" />
            <div className="w-0.5 h-2 bg-gray-400 -mt-0.5" />
          </div>
        );

      case "clip":
        return (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-10 border-2 border-gray-400 rounded-t-full bg-transparent" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 border-2 border-gray-400 rounded-full bg-white" />
          </div>
        );

      case "washi":
        return (
          <div
            className={cn(
              "absolute -top-2 left-1/2 w-20 h-6 opacity-80 rounded-none",
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
                "absolute -top-2 left-6 w-12 h-5 opacity-60 rounded-sm border",
                tapeColor.bg,
                tapeColor.border,
              )}
              style={{ transform: `rotate(${-15 + tapeRotation}deg)` }}
            />
            <div
              className={cn(
                "absolute -top-2 right-6 w-12 h-5 opacity-60 rounded-sm border",
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
    <div className="printable-card-wrapper">
      {showCutLines && (
        <div className="cut-lines" />
      )}

      {/* Polaroid Card */}
      <div className={cn("polaroid-card", paper.bg, paper.border)}>
        {renderDecoration()}

        {/* Image Container - maintains 3:4 aspect ratio */}
        <div className="image-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="card-image"
          />
        </div>

        {/* Caption */}
        <div className="caption">
          <p className="caption-text">
            {phrase || title}
          </p>
        </div>

        {/* Aging overlay */}
        {hasAging && (
          <div className="aging-overlay" />
        )}
      </div>
    </div>
  );
}
