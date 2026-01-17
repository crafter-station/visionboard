import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { put } from "@vercel/blob";

type PDFLayout = "2-col" | "3-col";
type PaperSize = "letter" | "a4";

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  letter: { width: 8.5, height: 11 },
  a4: { width: 8.27, height: 11.69 },
};

async function getBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Development: use local Chrome/Chromium
  const possiblePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  let executablePath: string | undefined;
  for (const path of possiblePaths) {
    try {
      const fs = await import("node:fs");
      if (fs.existsSync(path)) {
        executablePath = path;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium installation found. Please install Chrome or set CHROME_PATH environment variable."
    );
  }

  return puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath,
    headless: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId, layout = "2-col", showCutLines = true, paperSize = "letter" } = body as {
      boardId: string;
      layout?: PDFLayout;
      showCutLines?: boolean;
      paperSize?: PaperSize;
    };

    if (!boardId) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const printUrl = `${baseUrl}/print/${boardId}?layout=${layout}&showCutLines=${showCutLines}&paperSize=${paperSize}`;

    const browser = await getBrowser();

    try {
      const page = await browser.newPage();

      // Set viewport to match paper size
      const dimensions = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.letter;
      await page.setViewport({
        width: Math.round(dimensions.width * 96), // 96 DPI for screen
        height: Math.round(dimensions.height * 96),
        deviceScaleFactor: 2, // High DPI for better quality
      });

      await page.goto(printUrl, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for all images to load
      await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll("img"));
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              // Timeout per image
              setTimeout(resolve, 10000);
            });
          })
        );
      });

      // Small delay to ensure rendering is complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pdfBuffer = await page.pdf({
        format: paperSize === "a4" ? "A4" : "Letter",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      await page.close();

      // Upload PDF to Vercel Blob
      const filename = `vision-board-${boardId}-${layout}-${Date.now()}.pdf`;
      const blob = await put(filename, Buffer.from(pdfBuffer), {
        access: "public",
        contentType: "application/pdf",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({ url: blob.url, filename });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
