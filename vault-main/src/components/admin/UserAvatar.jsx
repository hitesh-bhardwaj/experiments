import Image from "next/image";

const initials = (name, email) =>
  (name || email || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

/**
 * An account's avatar on the admin pages: their photo, or their initials in orange on the
 * dark page colour inside a thin orange ring. Size it with `className` (default size-8);
 * the initials take the type class given in `textClassName`.
 */
export function UserAvatar({ name, email, imageUrl, className = "size-8", textClassName = "type-small" }) {
  if (imageUrl) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full ${className}`}>
        <Image src={imageUrl} alt="" fill sizes="64px" className="object-cover" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-background ${className}`}>
      <span className={`grid size-[calc(100%-6px)] place-items-center rounded-full text-primary ring-1 ring-inset ring-primary/50 ${textClassName}`}>{initials(name, email)}</span>
    </span>
  );
}
