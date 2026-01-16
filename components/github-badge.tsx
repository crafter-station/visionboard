"use client";

import { useState, useEffect } from "react";
import { GithubLogo } from "@/components/logos/github";

export function GithubBadge() {
  const [githubStars, setGithubStars] = useState<number | null>(null);

  useEffect(() => {
    const fetchGithubStars = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/crafter-station/visionboard",
        );
        if (response.ok) {
          const data = await response.json();
          setGithubStars(data.stargazers_count);
        }
      } catch (error) {
        console.warn("Failed to fetch GitHub stars:", error);
      }
    };
    fetchGithubStars();
  }, []);

  return (
    <a
      href="https://github.com/crafter-station/visionboard"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 sm:gap-2 p-2 sm:px-3 sm:py-1.5 bg-foreground/5 hover:bg-foreground/10 border rounded-md transition-colors"
    >
      <GithubLogo className="size-[18px]" />
      {githubStars !== null && (
        <span className="hidden sm:flex text-sm font-medium items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-yellow-500"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {githubStars}
        </span>
      )}
    </a>
  );
}
