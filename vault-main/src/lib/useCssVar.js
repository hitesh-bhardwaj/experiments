import { useEffect, useState } from "react";

// A CSS variable's value for JS that can't take a class (canvas, WebGL). Empty on the server and
// first render, so render the consumer only once it has a value.
export function useCssVar(name) {
  const [value, setValue] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  }, [name]);
  return value;
}

// Same lookup outside React (canvas draws, GSAP tweens): reads the variable at call time.
export function cssVar(name) {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
