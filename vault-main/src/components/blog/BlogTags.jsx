import styles from "@/app/(marketing)/blog/[slug]/blog-content.module.css";


export default function BlogTags({ tags = [] }) {
  if (!tags.length) return null;

  return (
    <div>
      {/* <hr className={styles.contentDivider} /> */}

      <div className="flex flex-wrap items-center gap-3 mt-10">
        <span className="text-[0.9vw] max-[1025px]:text-[2.2vw] max-md:text-lg text-light-grey">tags:</span>

        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-[#2B2B2B] font-mono px-2 py-0.5 text-[0.85vw] max-[1025px]:text-[2vw] flex items-center tracking-tight justify-center capitalize text-foreground max-md:px-2 max-md:text-muted max-md:text-sm"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
