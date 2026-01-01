import { ImageResponse } from "next/og";
import { getVisionBoard } from "@/db/queries";

export const runtime = "edge";
export const alt = "Vision Board 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

const ROTATION_RANGE = { min: -9, max: 14 };

function generateSeededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 10000) / 10000;
}

function getRandomRotation(id: string): number {
  const range = ROTATION_RANGE.max - ROTATION_RANGE.min;
  const random = generateSeededRandom(id);
  return ROTATION_RANGE.min + random * range;
}

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = await getVisionBoard(id);

  if (!board) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            color: "#fff",
            fontSize: 48,
            fontFamily: "system-ui",
          }}
        >
          Board Not Found
        </div>
      ),
      size
    );
  }

  const goalsWithImages = board.goals.filter((g) => g.generatedImageUrl);
  const cardWidth = 280;
  const cardHeight = Math.round(cardWidth * (FRAME.height / FRAME.width));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fafafa",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#0a0a0a" }}>
              Vision Board
            </span>
            <span style={{ fontSize: 16, color: "#737373" }}>2026 Edition</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 32px",
            gap: 16,
          }}
        >
          {goalsWithImages.slice(0, 3).map((goal) => (
            <div
              key={goal.id}
              style={{
                width: cardWidth,
                height: cardHeight,
                position: "relative",
                display: "flex",
                transform: `rotate(${getRandomRotation(goal.id)}deg)`,
              }}
            >
              {goal.generatedImageUrl && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(FRAME.photo.left / FRAME.width) * 100}%`,
                    top: `${(FRAME.photo.top / FRAME.height) * 100}%`,
                    width: `${(FRAME.photo.width / FRAME.width) * 100}%`,
                    height: `${(FRAME.photo.height / FRAME.height) * 100}%`,
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <img
                    src={goal.generatedImageUrl}
                    alt={goal.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}
              {goal.phrase && (
                <div
                  style={{
                    position: "absolute",
                    left: `${((FRAME.width - FRAME.text.width) / 2 / FRAME.width) * 100}%`,
                    top: `${(FRAME.text.top / FRAME.height) * 100}%`,
                    width: `${(FRAME.text.width / FRAME.width) * 100}%`,
                    height: `${(FRAME.text.height / FRAME.height) * 100}%`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 500,
                      textAlign: "center",
                      color: "#0a0a0a",
                    }}
                  >
                    {goal.phrase}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
