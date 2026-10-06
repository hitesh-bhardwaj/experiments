// import AuthBgVideo from "./AuthBgVideo";

export default function AuthShell({
  children,
  backHref = "/",
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20 text-white">
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </main>
  );
}