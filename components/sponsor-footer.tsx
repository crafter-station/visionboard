"use client";

import { CrafterStationLogo } from "@/components/logos/crafter-station";
import { KeboLogo } from "@/components/logos/kebo";
import { MoralejaDesignLogo } from "@/components/logos/moraleja-design";

export function SponsorFooter() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Built with</p>
          <div className="flex items-center gap-8">
            <a
              href="https://crafter.station"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <CrafterStationLogo className="h-8 w-auto" />
            </a>
            <a
              href="https://kebo.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <KeboLogo className="h-8 w-auto" />
            </a>
            <a
              href="https://moraleja.design"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              <MoralejaDesignLogo className="h-8 w-auto" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

