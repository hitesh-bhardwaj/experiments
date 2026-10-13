"use client";

import { useEffect, useState } from "react";

// View counts for these templates, fetched in the browser so the templates
// pages can stay static. null until loaded (cards show a skeleton), {} on failure.
export function useTemplateViewCounts(slugs) {
  const key = slugs.join(",");
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    fetch(`/api/templates/views?slugs=${encodeURIComponent(key)}`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((data) => active && setCounts(data));
    return () => {
      active = false;
    };
  }, [key]);

  return counts;
}
