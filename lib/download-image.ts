async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type FrameStyle = "tape" | "tape-corner" | "pin" | "clip" | "washi" | "double-tape";

const TAPE_COLORS = [
  { bg: "#fef3c7", border: "#fde68a" }, // yellow
  { bg: "#fce7f3", border: "#fbcfe8" }, // pink
  { bg: "#dbeafe", border: "#bfdbfe" }, // blue
  { bg: "#dcfce7", border: "#bbf7d0" }, // green
  { bg: "#ffedd5", border: "#fed7aa" }, // orange
  { bg: "#f3e8ff", border: "#e9d5ff" }, // purple
];

// Polaroid paper/frame color variations
const FRAME_PAPERS = [
  { bg: "#ffffff", border: "#e5e7eb", shadow: "rgba(0,0,0,0.15)" }, // classic white
  { bg: "#fffbeb", border: "#fef3c7", shadow: "rgba(120,53,15,0.1)" }, // vintage amber
  { bg: "#fafaf9", border: "#e7e5e4", shadow: "rgba(0,0,0,0.12)" }, // aged stone
  { bg: "#f8fafc", border: "#e2e8f0", shadow: "rgba(30,41,59,0.12)" }, // cool slate
  { bg: "#fff1f2", border: "#fecdd3", shadow: "rgba(159,18,57,0.08)" }, // warm rose
  { bg: "#f0f9ff", border: "#bae6fd", shadow: "rgba(7,89,133,0.08)" }, // fresh sky
  { bg: "#f7fee7", border: "#d9f99d", shadow: "rgba(63,98,18,0.08)" }, // spring lime
  { bg: "#fdf4ff", border: "#f5d0fe", shadow: "rgba(134,25,143,0.08)" }, // pop fuchsia
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
  tapeColor2: (typeof TAPE_COLORS)[number];
  tapeRotation: number;
  paper: (typeof FRAME_PAPERS)[number];
  hasAging: boolean;
} {
  const rand = seededRandom(id);
  const styles: FrameStyle[] = ["tape", "tape-corner", "pin", "clip", "washi", "double-tape"];
  const styleIndex = Math.floor(rand * styles.length);
  const tapeIndex = Math.floor(seededRandom(id + "tape") * TAPE_COLORS.length);
  const tapeRotation = (seededRandom(id + "rot") - 0.5) * 30;
  const paperIndex = Math.floor(seededRandom(id + "paper") * FRAME_PAPERS.length);
  const hasAging = seededRandom(id + "age") > 0.6;

  return {
    style: styles[styleIndex],
    tapeColor: TAPE_COLORS[tapeIndex],
    tapeColor2: TAPE_COLORS[(tapeIndex + 1) % TAPE_COLORS.length],
    tapeRotation,
    paper: FRAME_PAPERS[paperIndex],
    hasAging,
  };
}

function drawFrameDecoration(
  ctx: CanvasRenderingContext2D,
  config: ReturnType<typeof getFrameStyle>,
  cardX: number,
  cardY: number,
  cardWidth: number,
) {
  const { style, tapeColor, tapeColor2, tapeRotation } = config;

  switch (style) {
    case "tape": {
      const tapeWidth = 80;
      const tapeHeight = 24;
      ctx.save();
      ctx.translate(cardX + cardWidth / 2, cardY - tapeHeight / 2 + 12);
      ctx.rotate((tapeRotation * Math.PI) / 180);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = tapeColor.bg;
      ctx.fillRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tapeColor.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(-tapeWidth / 2, -tapeHeight / 2, tapeWidth, tapeHeight);
      ctx.restore();
      break;
    }

    case "tape-corner": {
      const cornerTapeW = 50;
      const cornerTapeH = 20;
      // Left corner
      ctx.save();
      ctx.translate(cardX + 20, cardY - 5);
      ctx.rotate((-45 * Math.PI) / 180);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = tapeColor.bg;
      ctx.fillRect(-cornerTapeW / 2, -cornerTapeH / 2, cornerTapeW, cornerTapeH);
      ctx.strokeStyle = tapeColor.border;
      ctx.strokeRect(-cornerTapeW / 2, -cornerTapeH / 2, cornerTapeW, cornerTapeH);
      ctx.restore();
      // Right corner
      ctx.save();
      ctx.translate(cardX + cardWidth - 20, cardY - 5);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = tapeColor.bg;
      ctx.fillRect(-cornerTapeW / 2, -cornerTapeH / 2, cornerTapeW, cornerTapeH);
      ctx.strokeStyle = tapeColor.border;
      ctx.strokeRect(-cornerTapeW / 2, -cornerTapeH / 2, cornerTapeW, cornerTapeH);
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }

    case "pin": {
      const pinX = cardX + cardWidth / 2;
      const pinY = cardY - 8;
      // Pin head
      ctx.beginPath();
      ctx.arc(pinX, pinY, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Pin shadow
      ctx.beginPath();
      ctx.arc(pinX + 2, pinY + 2, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fill();
      // Pin needle
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(pinX - 2, pinY + 8, 4, 10);
      break;
    }

    case "clip": {
      const clipX = cardX + cardWidth / 2;
      const clipY = cardY - 20;
      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 3;
      // Outer clip
      ctx.beginPath();
      ctx.moveTo(clipX - 15, clipY + 40);
      ctx.lineTo(clipX - 15, clipY + 10);
      ctx.arc(clipX, clipY + 10, 15, Math.PI, 0, false);
      ctx.lineTo(clipX + 15, clipY + 40);
      ctx.stroke();
      // Inner clip
      ctx.beginPath();
      ctx.arc(clipX, clipY + 20, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();
      break;
    }

    case "washi": {
      const washiWidth = 100;
      const washiHeight = 24;
      ctx.save();
      ctx.translate(cardX + cardWidth / 2, cardY - washiHeight / 2 + 12);
      ctx.rotate((tapeRotation * Math.PI) / 180);
      ctx.globalAlpha = 0.8;
      // Striped pattern
      const gradient = ctx.createLinearGradient(-washiWidth / 2, 0, washiWidth / 2, 0);
      gradient.addColorStop(0, tapeColor.bg);
      gradient.addColorStop(0.5, tapeColor.border);
      gradient.addColorStop(1, tapeColor.bg);
      ctx.fillStyle = gradient;
      ctx.fillRect(-washiWidth / 2, -washiHeight / 2, washiWidth, washiHeight);
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }

    case "double-tape": {
      const dtWidth = 60;
      const dtHeight = 20;
      // Left tape
      ctx.save();
      ctx.translate(cardX + 50, cardY - 5);
      ctx.rotate(((-15 + tapeRotation) * Math.PI) / 180);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = tapeColor.bg;
      ctx.fillRect(-dtWidth / 2, -dtHeight / 2, dtWidth, dtHeight);
      ctx.strokeStyle = tapeColor.border;
      ctx.strokeRect(-dtWidth / 2, -dtHeight / 2, dtWidth, dtHeight);
      ctx.restore();
      // Right tape
      ctx.save();
      ctx.translate(cardX + cardWidth - 50, cardY - 5);
      ctx.rotate(((15 + tapeRotation) * Math.PI) / 180);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = tapeColor2.bg;
      ctx.fillRect(-dtWidth / 2, -dtHeight / 2, dtWidth, dtHeight);
      ctx.strokeStyle = tapeColor2.border;
      ctx.strokeRect(-dtWidth / 2, -dtHeight / 2, dtWidth, dtHeight);
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function downloadImageWithFrame(
  imageUrl: string,
  phrase: string,
  fileName: string,
  goalId = "default",
): Promise<void> {
  const frameConfig = getFrameStyle(goalId);

  // Polaroid dimensions matching 3:4 aspect ratio display
  const cardPadding = 16;
  const captionHeight = 64;
  const decorationSpace = 32;
  const imageWidth = 600;
  const imageHeight = 720;

  const cardWidth = imageWidth + cardPadding * 2;
  const cardHeight = imageHeight + cardPadding + captionHeight;
  const canvasPadding = 32;

  const canvas = document.createElement("canvas");
  canvas.width = cardWidth + canvasPadding * 2;
  canvas.height = cardHeight + canvasPadding * 2 + decorationSpace;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const { paper, hasAging } = frameConfig;

  // Light background
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cardX = canvasPadding;
  const cardY = canvasPadding + decorationSpace / 2;

  // Card shadow with paper-specific shadow color
  ctx.save();
  ctx.shadowColor = paper.shadow;
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = paper.bg;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 4);
  ctx.fill();
  ctx.restore();

  // Card background with paper color
  ctx.fillStyle = paper.bg;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 4);
  ctx.fill();

  // Card border with paper-specific color
  ctx.strokeStyle = paper.border;
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 4);
  ctx.stroke();

  // Draw frame decoration based on style
  drawFrameDecoration(ctx, frameConfig, cardX, cardY, cardWidth);

  // Add aging/vintage overlay if applicable
  if (hasAging) {
    ctx.save();
    const agingGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
    agingGradient.addColorStop(0, "rgba(251, 191, 36, 0.08)");
    agingGradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    agingGradient.addColorStop(1, "rgba(180, 83, 9, 0.06)");
    ctx.fillStyle = agingGradient;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 4);
    ctx.fill();
    ctx.restore();
  }

  // Load and draw image
  const generatedImage = await loadImage(imageUrl);
  const imageX = cardX + cardPadding;
  const imageY = cardY + cardPadding;

  // Calculate crop to fill the frame while maintaining aspect ratio
  const imgAspect = generatedImage.width / generatedImage.height;
  const frameAspect = imageWidth / imageHeight;

  let srcX = 0,
    srcY = 0,
    srcW = generatedImage.width,
    srcH = generatedImage.height;

  if (imgAspect > frameAspect) {
    // Image is wider - crop sides
    srcW = generatedImage.height * frameAspect;
    srcX = (generatedImage.width - srcW) / 2;
  } else {
    // Image is taller - crop top/bottom
    srcH = generatedImage.width / frameAspect;
    srcY = (generatedImage.height - srcH) / 2;
  }

  // Draw image with rounded corners
  ctx.save();
  roundRect(ctx, imageX, imageY, imageWidth, imageHeight, 2);
  ctx.clip();
  ctx.drawImage(
    generatedImage,
    srcX,
    srcY,
    srcW,
    srcH,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
  );
  ctx.restore();

  // Subtle vignette overlay
  const gradient = ctx.createRadialGradient(
    imageX + imageWidth / 2,
    imageY + imageHeight / 2,
    0,
    imageX + imageWidth / 2,
    imageY + imageHeight / 2,
    imageWidth * 0.7,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.05)");
  ctx.fillStyle = gradient;
  roundRect(ctx, imageX, imageY, imageWidth, imageHeight, 2);
  ctx.fill();

  // Draw caption/phrase
  if (phrase) {
    const captionY = cardY + cardPadding + imageHeight + 8;
    const fontSize = 20;
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#4b5563";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const textX = cardX + cardWidth / 2;
    const maxTextWidth = cardWidth - cardPadding * 2;
    const lines = wrapText(ctx, phrase, maxTextWidth);
    const lineHeight = fontSize * 1.4;
    const totalHeight = lines.length * lineHeight;
    const startY = captionY + (captionHeight - totalHeight) / 2;

    for (let i = 0; i < Math.min(lines.length, 2); i++) {
      ctx.fillText(lines[i], textX, startY + i * lineHeight);
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

