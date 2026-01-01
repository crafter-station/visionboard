import { notFound } from "next/navigation";
import { getVisionBoard } from "@/db/queries";
import { ShareCanvas } from "@/components/share-canvas";
import { SponsorFooter } from "@/components/sponsor-footer";
import { GithubBadge } from "@/components/github-badge";
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
      images: [`/board/${id}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/board/${id}/opengraph-image`],
    },
  };
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const board = await getVisionBoard(id);

  if (!board) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Agentic Vision Board</h1>
              <p className="text-sm text-muted-foreground">2026 Edition</p>
            </div>
            <div className="flex items-center gap-4">
              <GithubBadge />
              <a
                href="/"
                className="text-sm font-medium hover:underline underline-offset-4"
              >
                Create your own
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 flex-1">
        <ShareCanvas board={board} />
      </div>

      <SponsorFooter />
    </main>
  );
}

