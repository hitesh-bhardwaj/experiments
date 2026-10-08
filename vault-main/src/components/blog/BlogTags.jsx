export default function BlogTags({ tags = [] }) {
  if (!tags.length) return null;

  return (
    <div>
      {/* <hr className="blog-divider" /> */}

      <div className="flex flex-wrap items-center gap-3 pt-10">
        <span className="text-[0.9vw] text-black/60 max-[1025px]:text-[2.2vw] max-md:text-[4.4vw]">tags:</span>

        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center justify-center bg-black/5 px-2 py-0.5 font-mono text-[0.9vw] capitalize tracking-tight text-ink max-[1025px]:text-[2vw] max-md:text-[3.6vw]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
