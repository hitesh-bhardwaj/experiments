import { createPageMetadata, getCanonicalUrl } from "@/lib/seo-metadata";

export function generateMetadata({
  title,
  description,
  image,
  url,
  date_published = new Date().toISOString(),
  date_modified = new Date().toISOString()
}) {
  const imageUrl = getCanonicalUrl(`/seo/${image || 'homepage.png'}`);

  return {
    ...createPageMetadata({
      title,
      description,
      path: url,
    }),
    title,
    description,
    path: `${url}`,
    img: image || 'homepage.png',
    date_published,
    date_modified,
    alternates: {
      canonical: getCanonicalUrl(url),
      languages: {
        hrefLang: 'x-default',
      },
    },
    openGraph: {
      title,
      description,
      url: getCanonicalUrl(url),
      siteName: 'Hyperiux',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: 'Hyperiux',
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  
  };
  
}
