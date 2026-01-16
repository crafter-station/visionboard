"use client";

import { CrafterStationLogo } from "@/components/logos/crafter-station";
import { GithubLogo } from "@/components/logos/github";
import { KeboLogo } from "@/components/logos/kebo";
import { MoralejaDesignLogo } from "@/components/logos/moraleja-design";

export function SponsorFooter() {
  return (
    <footer className="container mx-auto px-3 sm:px-4 pb-4 sm:pb-6 mt-auto">
      <div className="max-w-4xl mx-auto py-4 sm:py-5 px-4 sm:px-6 bg-card dark:bg-black/90 backdrop-blur border rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Built with 💛 💜 💚</p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <a
              href="https://crafterstation.com"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <CrafterStationLogo className="h-5 sm:h-6 w-auto" />
            </a>
            <a
              href="https://kebo.app"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <KeboLogo className="h-5 sm:h-6 w-auto" />
            </a>
            <a
              href="https://moraleja.co"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <MoralejaDesignLogo className="h-5 sm:h-6 w-auto" />
            </a>
            <a
              href="https://github.com/crafter-station"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <GithubLogo className="h-5 sm:h-6 w-auto" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
