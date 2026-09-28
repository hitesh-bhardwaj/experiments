import Link from "next/link";

// Renders a blogPost's `ctaBanner` (the same effectCtaBanner object
// effectContent uses) as the sticky sidebar's promo card.
export default function BlogPromoCard({ cta }) {
  if (!cta?.heading) return null;

  return (
    <div className="blog-promo-card">
      <p className="blog-promo-heading">{cta.heading}</p>
      {cta.description && <p className="blog-promo-description">{cta.description}</p>}
      {cta.buttonText && cta.buttonLink && (
        <Link href={cta.buttonLink} className="blog-promo-button">
          {cta.buttonText}
        </Link>
      )}
    </div>
  );
}
