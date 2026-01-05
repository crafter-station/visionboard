"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export type PDFLayout = "2x2" | "2x3" | "3x3" | "1x2" | "full";

export interface PDFLayoutOption {
  id: PDFLayout;
  name: string;
  description: string;
  cols: number;
  rows: number;
  cardsPerPage: number;
}

export const PDF_LAYOUTS: PDFLayoutOption[] = [
  {
    id: "2x2",
    name: "2×2 Grid",
    description: "4 cards per page, large size",
    cols: 2,
    rows: 2,
    cardsPerPage: 4,
  },
  {
    id: "2x3",
    name: "2×3 Grid",
    description: "6 cards per page, medium size",
    cols: 2,
    rows: 3,
    cardsPerPage: 6,
  },
  {
    id: "3x3",
    name: "3×3 Grid",
    description: "9 cards per page, compact size",
    cols: 3,
    rows: 3,
    cardsPerPage: 9,
  },
  {
    id: "1x2",
    name: "1×2 Strip",
    description: "2 cards per page, extra large",
    cols: 1,
    rows: 2,
    cardsPerPage: 2,
  },
  {
    id: "full",
    name: "Full Page",
    description: "1 card per page, maximum size",
    cols: 1,
    rows: 1,
    cardsPerPage: 1,
  },
];

interface GoalForPDF {
  id: string;
  title: string;
  phrase: string | null | undefined;
  imageBase64: string;
}

// Styles for the PDF
const createStyles = (layout: PDFLayoutOption) => {
  const pageMargin = 20;
  const cardGap = 12;
  const cutLineWidth = 0.5;

  // Calculate card dimensions based on layout
  // Letter size: 612 x 792 points (8.5 x 11 inches at 72 DPI)
  const pageWidth = 612 - pageMargin * 2;
  const pageHeight = 792 - pageMargin * 2;

  const cardWidth = (pageWidth - cardGap * (layout.cols - 1)) / layout.cols;
  const cardHeight = (pageHeight - cardGap * (layout.rows - 1)) / layout.rows;

  // Maintain 3:4 aspect ratio for the image area
  const imageAspectRatio = 3 / 4;
  const captionHeight = 40;
  const cardPadding = 8;

  // Calculate actual image dimensions within the card
  const maxImageWidth = cardWidth - cardPadding * 2;
  const maxImageHeight = cardHeight - cardPadding * 2 - captionHeight;

  let imageWidth = maxImageWidth;
  let imageHeight = imageWidth / imageAspectRatio;

  if (imageHeight > maxImageHeight) {
    imageHeight = maxImageHeight;
    imageWidth = imageHeight * imageAspectRatio;
  }

  return StyleSheet.create({
    page: {
      padding: pageMargin,
      backgroundColor: "#ffffff",
    },
    grid: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: cardGap,
    },
    cardWrapper: {
      width: cardWidth,
      height: cardHeight,
      position: "relative",
    },
    cutLines: {
      position: "absolute",
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderWidth: cutLineWidth,
      borderColor: "#cccccc",
      borderStyle: "dashed",
    },
    // Shadow layers (react-pdf doesn't support box-shadow)
    shadowLayer1: {
      position: "absolute",
      top: 3,
      left: 3,
      right: -3,
      bottom: -3,
      backgroundColor: "#00000008",
    },
    shadowLayer2: {
      position: "absolute",
      top: 2,
      left: 2,
      right: -2,
      bottom: -2,
      backgroundColor: "#00000005",
    },
    card: {
      position: "relative",
      width: "100%",
      height: "100%",
      backgroundColor: "#ffffff",
      padding: cardPadding,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    imageContainer: {
      width: imageWidth,
      height: imageHeight,
      backgroundColor: "#f3f4f6",
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    caption: {
      width: "100%",
      height: captionHeight,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 6,
    },
    captionText: {
      fontSize: layout.cols >= 3 ? 7 : layout.cols === 2 ? 9 : 11,
      color: "#4b5563",
      textAlign: "center",
      fontFamily: "Helvetica",
    },
    footer: {
      position: "absolute",
      bottom: 8,
      left: 0,
      right: 0,
      textAlign: "center",
      fontSize: 8,
      color: "#9ca3af",
    },
    pageNumber: {
      position: "absolute",
      bottom: 8,
      right: pageMargin,
      fontSize: 8,
      color: "#9ca3af",
    },
  });
};

// PDF Document Component
function VisionBoardPDF({
  goals,
  layout,
  showCutLines = true,
}: {
  goals: GoalForPDF[];
  layout: PDFLayoutOption;
  showCutLines?: boolean;
}) {
  const styles = createStyles(layout);
  const { cardsPerPage } = layout;

  // Split goals into pages
  const pages: GoalForPDF[][] = [];
  for (let i = 0; i < goals.length; i += cardsPerPage) {
    pages.push(goals.slice(i, i + cardsPerPage));
  }

  return (
    <Document>
      {pages.map((pageGoals, pageIndex) => (
        <Page key={pageIndex} size="LETTER" style={styles.page}>
          <View style={styles.grid}>
            {pageGoals.map((goal) => (
              <View key={goal.id} style={styles.cardWrapper}>
                {showCutLines && <View style={styles.cutLines} />}
                {/* Shadow layers */}
                <View style={styles.shadowLayer1} />
                <View style={styles.shadowLayer2} />
                <View style={styles.card}>
                  <View style={styles.imageContainer}>
                    <Image src={goal.imageBase64} style={styles.image} />
                  </View>
                  <View style={styles.caption}>
                    <Text style={styles.captionText}>
                      {goal.phrase || goal.title}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.pageNumber}>
            Page {pageIndex + 1} of {pages.length}
          </Text>
        </Page>
      ))}
    </Document>
  );
}

// Convert image URL to base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    // Return a placeholder
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
}

// Main export function to generate and download PDF
export async function generateVisionBoardPDF(
  goals: Array<{
    id: string;
    title: string;
    phrase?: string | null;
    generatedImageUrl?: string | null;
  }>,
  layoutId: PDFLayout = "2x3",
  showCutLines = true,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const layout = PDF_LAYOUTS.find((l) => l.id === layoutId) || PDF_LAYOUTS[1];

  // Filter goals with images
  const goalsWithImages = goals.filter((g) => g.generatedImageUrl);

  if (goalsWithImages.length === 0) {
    throw new Error("No images to export");
  }

  // Convert all images to base64
  const goalsForPDF: GoalForPDF[] = [];
  for (let i = 0; i < goalsWithImages.length; i++) {
    const goal = goalsWithImages[i];
    onProgress?.(i + 1, goalsWithImages.length);
    const imageBase64 = await imageUrlToBase64(goal.generatedImageUrl!);
    goalsForPDF.push({
      id: goal.id,
      title: goal.title,
      phrase: goal.phrase,
      imageBase64,
    });
  }

  // Generate PDF blob
  const doc = (
    <VisionBoardPDF
      goals={goalsForPDF}
      layout={layout}
      showCutLines={showCutLines}
    />
  );
  const blob = await pdf(doc).toBlob();

  // Download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vision-board-${layoutId}-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

