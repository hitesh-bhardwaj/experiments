// Tailwind breakpoints as used on the site (see STYLE_GUIDE.md). lg is set to
// 1025px in globals.css, so max-lg: is "below 1025px". Use these in JS
// (matchMedia, resize logic) so code and classes switch at the same widths.
export const BREAKPOINTS = { lg: 1025, md: 768, sm: 640 };

// Same ranges as the max-lg: / max-md: / max-sm: variants
export const MEDIA = {
  tablet: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
  mobile: `(max-width: ${BREAKPOINTS.md - 1}px)`,
  smallMobile: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
};
