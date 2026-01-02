import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold tracking-tighter">404</h1>
          <p className="text-xl text-muted-foreground">
            This page got lost manifesting somewhere else
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          The vision board you are looking for does not exist or has been
          removed.
        </p>
        <Button asChild size="lg">
          <Link href="/">Create Your Vision Board</Link>
        </Button>
      </div>
    </main>
  );
}
