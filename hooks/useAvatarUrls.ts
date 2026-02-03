import { useCallback, useEffect, useState } from "react";
import { getSignedUrl, getSignedUrlsBatch } from "@/lib/storage";

type Entity = { id: string; avatar_url: string | null };

/**
 * Unified avatar URL loader with optional batch prefetch.
 * - strategy 'lazy': load on demand via `loadAvatarUrl(id, path)`
 * - strategy 'batch': prefetch all non-null avatar paths on mount
 */
export function useAvatarUrls(
  entities: Entity[],
  strategy: "lazy" | "batch" = "lazy"
) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  const loadAvatarUrl = useCallback(
    async (entityId: string, avatarPath: string | null | undefined) => {
      if (!avatarPath || urls[entityId]) return;
      // If avatarPath is already a public URL, just use it
      if (/^https?:\/\//i.test(avatarPath)) {
        setUrls((prev) => ({ ...prev, [entityId]: avatarPath }));
        return;
      }
      const { signedUrl } = await getSignedUrl("avatars", avatarPath);
      if (signedUrl) {
        setUrls((prev) => ({ ...prev, [entityId]: signedUrl }));
      }
    },
    [urls]
  );

  // Optional batch prefetch on mount
  useEffect(() => {
    if (strategy !== "batch") return;
    const paths = entities.filter((e) => !!e.avatar_url).map((e) => e.avatar_url!)
    if (paths.length === 0) return;

    getSignedUrlsBatch("avatars", paths).then(({ signedUrls }) => {
      const map: Record<string, string> = {};
      entities.forEach((e) => {
        const p = e.avatar_url;
        if (p && signedUrls[p]) map[e.id] = signedUrls[p];
      });
      setUrls(map);
    });
  }, [entities, strategy]);

  return { avatarUrls: urls, loadAvatarUrl };
}
