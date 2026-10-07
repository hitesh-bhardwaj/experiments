export default function StatCard({
  children,
  label,
  framed = false,
  className = "",
  contentClassName = "",
}) {
  const mark =
    "pointer-events-none absolute size-[0.3vw] border-white/20 transition-colors duration-500 group-hover:border-primary max-lg:size-1.5  max-md:size-2 max-sm:size-1.5";

  const content = framed
    ? (Array.isArray(children) ? children : [children]).filter(Boolean).map(
      (child, index) => (
        <div
          key={index}
          className="group  relative inline-flex border border-grey items-center justify-center max-lg:size-[12vw] max-md:size-[16vw] size-[7vw] aspect-square"
        >
          <span className={`${mark} -top-px -left-px border-t border-l`} />
          <span className={`${mark} -top-px -right-px border-t border-r`} />
          <span className={`${mark} -bottom-px -left-px border-b border-l`} />
          <span className={`${mark} -bottom-px -right-px border-b border-r`} />
          {child}
        </div>
      ),
    )
    : children;

  const labelParts =
    typeof label === "string"
      ? label.split("|").map((part) => part.trim()).filter(Boolean)
      : null;

  return (
    <div
      className={[
        "relative flex min-h-[21vw] flex-col justify-between border border-grey p-[1.65vw] text-white backdrop-blur-sm",
        "max-lg:min-h-[28vw] max-lg:p-[2.4vw]",
        "max-md:min-h-[34vw] max-md:p-5",
        "max-sm:min-h-[48vw] max-sm:p-3",
        className,
      ].join(" ")}
    >
      <div className={contentClassName}>{content}</div>
      {labelParts?.length ? (
        <p className="flex items-center gap-[1vw] text22 leading-none font-heading text-white max-lg:gap-2 max-md:gap-1.5 max-md:text-[2.4vw] max-sm:gap-2 max-sm:text-[4vw]">
          {labelParts.map((part, index) => (
            <span key={`${part}-${index}`} className="contents">
              {index > 0 ? (
                <span
                  aria-hidden
                  className="inline-block size-[0.45vw] shrink-0 bg-primary max-lg:size-1 max-md:size-1.5 max-sm:size-1"
                />
              ) : null}
              <span>{part}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
