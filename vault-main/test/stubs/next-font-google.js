// Test-only stub for "next/font/google" (see vitest.config.js alias).
// next/font's build-time font loading has no meaning to a Node-based test
// runner - effects only ever read the returned `.className`, so a fake
// loader that returns a stable class is enough to mount-test without
// pulling in real font files. Named exports match what registry effects
// actually import; add more here if a new effect needs another font.
const fakeFont = () => ({ className: "next-font-stub", style: {} });

export const Roboto_Flex = fakeFont;
export const Inter = fakeFont;
