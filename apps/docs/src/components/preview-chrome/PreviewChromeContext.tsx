"use client";

import { createContext, useContext } from "react";

// True while a demo page shows the preview chrome (or runs inside its device
// iframe). DemoHeader reads it and steps aside, since the chrome's bar already
// carries the "back to the effect" link.
const PreviewChromeContext = createContext(false);

export const PreviewChromeProvider = PreviewChromeContext.Provider;
export const usePreviewChromeActive = () => useContext(PreviewChromeContext);
