// next-transition-router coordinates page transitions with Next's app
// router, which doesn't exist outside a real Next.js request tree. Render
// tests only need to confirm the wrapped effect mounts, so this stub renders
// children directly and skips the actual transition/router wiring.
export function TransitionRouter({ children }) {
  return children;
}
