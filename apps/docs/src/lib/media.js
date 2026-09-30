import { homepage } from "./util";

const DEFAULT_R2_ORIGIN =
  process.env.NEXT_PUBLIC_DEV_URL || "";

export function resolveMediaUrl(
  rawMediaUrl,
  { defaultDirectory, defaultExtension } = {}
) {
  if (!rawMediaUrl) return null;

  const src = String(rawMediaUrl).trim();
  if (!src) return null;
  if (/^(https?:)?\/\//.test(src)) return src;

  const baseUrl = process.env.NEXT_PUBLIC_DEV_URL || "";
  const normalized = src.replace(/^\/+/, "").replace(/\/+$/, "");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalized);
  const pathWithExtension =
    defaultExtension && !hasExtension
      ? `${normalized}.${defaultExtension.replace(/^\./, "")}`
      : normalized;
  const mediaPath =
    defaultDirectory && !pathWithExtension.includes("/")
      ? `${defaultDirectory.replace(/^\/+|\/+$/g, "")}/${pathWithExtension}`
      : pathWithExtension;

  return `${baseUrl}/${mediaPath}`;
}

export function resolveEffectVideoUrl(effect) {
  const rawVideoUrl = effect?.videoUrl || effect?.videoURL || effect?.video_url;
  if (!rawVideoUrl) return null;

  const src = String(rawVideoUrl).trim();
  if (!src) return null;
  if (/^(https?:)?\/\//.test(src)) return src;

  const category =
    effect?.categorySlug ||
    effect?.category ||
    (Array.isArray(effect?.categories) ? effect.categories.find(Boolean) : null);
  const effectName =
    effect?.effectSlug ||
    effect?.slug ||
    effect?.name ||
    src.replace(/^\/+/, "").replace(/\/+$/, "").split("/").pop()?.replace(/\.mp4$/i, "");

  if (!category || !effectName) {
    return resolveMediaUrl(rawVideoUrl, { defaultExtension: "mp4" });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_DEV_URL || "").replace(/\/+$/, "");
  return `${baseUrl}/VaultVideos/${String(category).replace(/^\/+|\/+$/g, "")}/${String(effectName).replace(/^\/+|\/+$/g, "")}.mp4`;
}

export function resolveDirectR2MediaUrl(
  rawMediaUrl,
  { defaultDirectory, defaultExtension } = {}
) {
  if (!rawMediaUrl) return null;

  const src = String(rawMediaUrl).trim();
  if (!src) return null;
  if (/^(https?:)?\/\//.test(src)) return src;

  const normalized = src.replace(/^\/+/, "").replace(/\/+$/, "");
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(normalized);
  const pathWithExtension =
    defaultExtension && !hasExtension
      ? `${normalized}.${defaultExtension.replace(/^\./, "")}`
      : normalized;
  const mediaPath =
    defaultDirectory && !pathWithExtension.includes("/")
      ? `${defaultDirectory.replace(/^\/+|\/+$/g, "")}/${pathWithExtension}`
      : pathWithExtension;

  return `${DEFAULT_R2_ORIGIN.replace(/\/+$/, "")}/${mediaPath}`;
}

export function resizeR2ImageUrl(
  imageUrl,
  { width = 1200, height = 630 } = {}
) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(height));
    return url.toString();
  } catch {
    return imageUrl;
  }
}

export function resolveOgImageUrl(
  rawMediaUrl,
  { defaultDirectory, defaultExtension } = {}
) {
  const resolvedUrl = resolveDirectR2MediaUrl(rawMediaUrl, {
    defaultDirectory,
    defaultExtension,
  });

  if (!resolvedUrl) return null;

  try {
    return resizeR2ImageUrl(resolvedUrl, {
      width: 1200,
      height: 630,
    });
  } catch {
    return resolvedUrl;
  }
}
