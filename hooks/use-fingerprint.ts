"use client";

import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedVisitorId: string | null = null;

export function useFingerprint() {
  const [visitorId, setVisitorId] = useState<string | null>(cachedVisitorId);
  const [isLoading, setIsLoading] = useState(!cachedVisitorId);

  useEffect(() => {
    if (cachedVisitorId) {
      setVisitorId(cachedVisitorId);
      setIsLoading(false);
      return;
    }

    const getFingerprint = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      cachedVisitorId = result.visitorId;
      setVisitorId(result.visitorId);
      setIsLoading(false);
    };

    getFingerprint();
  }, []);

  return { visitorId, isLoading };
}
