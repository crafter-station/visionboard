import { notFound } from "next/navigation";
import { getVisionBoard } from "@/db/queries";
import { BoardView } from "./board-view";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const board = await getVisionBoard(id);

  if (!board) {
    return { title: "Board Not Found" };
  }

  const goalCount = board.goals.length;
  const title = `My 2026 Agentic Vision Board`;
  const description = `An agentic vision board with ${goalCount} goal${goalCount !== 1 ? "s" : ""} for 2026`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.agenticboard.xyz/b/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const board = await getVisionBoard(id);

  if (!board) {
    notFound();
  }

  return <BoardView board={board} />;
}
