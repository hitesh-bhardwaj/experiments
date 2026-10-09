export default function BlogTags({ tags = [] }) {
  if (!tags.length) return null;

  return (
    <div>
      {/* <hr className="blog-divider" /> */}

      <div className="flex flex-wrap items-center gap-3 pt-10">
        <span className="type-small text-black/60">tags:</span>

        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center justify-center bg-black/5 px-2 py-0.5 type-small capitalize text-ink"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
