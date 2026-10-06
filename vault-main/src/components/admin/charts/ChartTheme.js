// Shared visual language for every admin activity chart, matching the
// site's dark dashboard cards (#272727) and #ff5f00 accent instead of
// recharts' library defaults.
export const CHART_COLORS = [
  "#ff5f00",
  "#f16b0d",
  "#4ade80",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
];

export const CHART_GRID_PROPS = {
  stroke: "rgba(255,255,255,0.08)",
  vertical: false,
};

export const CHART_AXIS_PROPS = {
  stroke: "rgba(255,255,255,0.15)",
  tick: { fill: "rgba(255,255,255,0.5)", fontSize: 12 },
  tickLine: false,
  axisLine: false,
};

export const CHART_TOOLTIP_CONTENT_STYLE = {
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#ffffff",
  fontSize: 13,
};

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "rgba(255,255,255,0.5)",
  marginBottom: 4,
};
