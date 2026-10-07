// A <button> styled like WebsiteComps/LinkButton (roll-up label + underline),
// for actions that aren't navigation: OAuth, resend code, change a step
export function UnderlineButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`group relative inline-block w-fit cursor-pointer pb-1 whitespace-nowrap text-white [text-transform:inherit] transition-colors duration-300 hover:text-primary disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    >
      <span className="relative inline-flex">
        <span className="relative inline-flex h-[1.4em] overflow-hidden">
          <span className="inline-block transition-transform duration-300 ease-in-out group-hover:-translate-y-full">{children}</span>
          <span aria-hidden="true" className="absolute top-0 left-0 inline-block translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0">
            {children}
          </span>
        </span>
        <span aria-hidden="true" className="absolute top-full left-0 h-px w-full bg-current" />
      </span>
    </button>
  );
}
