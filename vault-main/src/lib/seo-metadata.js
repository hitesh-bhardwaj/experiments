import { homepage } from "./util";

const DEFAULT_TITLE = "Hyperiux Vault - React & Next.js Interaction Effects.";
const DEFAULT_DESCRIPTION =
  "Start with 50+ free source-first effects. Join Pro for 150+ effects.";
const DEFAULT_IMAGE = "/seo/homepage.png";

export function getCanonicalUrl(path = "/") {
  return new URL(path || "/", homepage).toString();
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  canonicalPath,
  openGraphPath,
  languagesPath,
  image = DEFAULT_IMAGE,
  keywords,
  robots,
} = {}) {
  const canonical = getCanonicalUrl(canonicalPath || path);
  const openGraphUrl = getCanonicalUrl(openGraphPath || canonicalPath || path);
  const languagesUrl = getCanonicalUrl(languagesPath || path);
  const imageUrl = getCanonicalUrl(image || DEFAULT_IMAGE);
  const resolvedTitle = title || DEFAULT_TITLE;
  const resolvedDescription = description || DEFAULT_DESCRIPTION;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords,
    url: path,
    alternates: {
      canonical,
      languages: {
        "en-US": languagesUrl,
        "x-default": languagesUrl,
      },
    },
    openGraph: {
      title: resolvedTitle || DEFAULT_TITLE,
      description: resolvedDescription || DEFAULT_DESCRIPTION,
      url: openGraphUrl,
      siteName: "Hyperiux Vault",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Hyperiux Vault",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@_hyperiux_",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [imageUrl],
    },
    robots,
  };
}

export function createRootMetadata() {
  const title = DEFAULT_TITLE;
  const description = DEFAULT_DESCRIPTION;
  const canonical = getCanonicalUrl("/");
  const imageUrl = getCanonicalUrl(DEFAULT_IMAGE);

  return {
    metadataBase: new URL(homepage),
    ...createPageMetadata({
      title,
      description,
      path: "/",
      canonicalPath: "/",
      openGraphPath: "/",
      image: DEFAULT_IMAGE,
      robots: {
        index: true,
        follow: true,
      },
    }),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Hyperiux Vault",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Hyperiux Vault",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: "@_hyperiux_",
      title,
      description,
      images: [imageUrl],
    },
  };
}
