import Image from "next/image";
import { User } from "lucide-react";

// Square avatar, name over role - no "Published by" label. The rail's other
// metadata rows carry their own labels, so one here read as noise.
export default function BlogAuthor({ author, className = "" }) {
  if (!author?.name) return null;

  const designation = author.designation || author.role;
  const image = author.image || author.avatar;
  const avatarClassName =
    "h-[3.5vw] w-[3.5vw] max-lg:h-[10vw] max-lg:w-[10vw] max-md:h-[14vw] max-md:w-[14vw] shrink-0 overflow-hidden";

  return (
    <div className={`flex items-center gap-[0.9vw] max-lg:gap-4 ${className}`}>
      {image?.url ? (
        <div className={avatarClassName}>
          <Image
            src={image.url}
            alt={author.name}
            width={200}
            height={200}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`${avatarClassName} flex items-center justify-center bg-black/5 ring-1 ring-black/10`}
          aria-label={author.name}
        >
          <User className="h-[55%] w-[55%] text-black/60" strokeWidth={1.5} />
        </div>
      )}

      <div className="flex flex-col gap-[0.4vw]">
        <p className="type-small text-ink">
          {author.name}
        </p>
        {designation && (
          <p className="type-small text-black/60">
            {designation}
          </p>
        )}
      </div>
    </div>
  );
}
