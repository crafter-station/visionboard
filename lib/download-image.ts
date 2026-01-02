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

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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

export async function downloadImageWithFrame(
  imageUrl: string,
  phrase: string,
  fileName: string,
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = FRAME.width;
  canvas.height = FRAME.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, FRAME.width, FRAME.height);

  const [generatedImage, frameImage] = await Promise.all([
    loadImage(imageUrl),
    loadImage("/frames/frame-7.png"),
  ]);

  ctx.drawImage(
    generatedImage,
    FRAME.photo.left,
    FRAME.photo.top,
    FRAME.photo.width,
    FRAME.photo.height,
  );

  ctx.drawImage(frameImage, 0, 0, FRAME.width, FRAME.height);

  if (phrase) {
    const fontSize = 48;
    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const textX = FRAME.width / 2;
    const textCenterY = FRAME.text.top + FRAME.text.height / 2;
    const maxTextWidth = FRAME.text.width - 40;

    const lines = wrapText(ctx, phrase, maxTextWidth);
    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const startY = textCenterY - totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
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

