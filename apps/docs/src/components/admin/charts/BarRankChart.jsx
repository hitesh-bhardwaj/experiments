"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_PROPS,
  CHART_GRID_PROPS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "./ChartTheme";

// Horizontal ranking bar chart (top saved effects, top copied effects).
// `data` is [{ name: "Circular Slider", value: 42 }, ...], already sorted
// and capped by the caller.
export function BarRankChart({
  data,
  nameKey = "name",
  dataKey = "value",
  color = "#ff5f00",
  height = 260,
  valueLabel,
}) {
  if (!data?.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-white/40"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  // `height` is a floor, not a fixed value - with a fixed height and enough
  // bars, recharts doesn't have room for every category tick and silently
  // thins them out (every other label), which read as "half the names are
  // missing." Growing the chart with the data keeps one row of vertical
  // space per bar so every label actually gets drawn.
  const chartHeight = Math.max(height, data.length * 42);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...CHART_AXIS_PROPS} />
        <YAxis
          type="category"
          dataKey={nameKey}
          interval={0}
          {...CHART_AXIS_PROPS}
          width={140}
          tick={{ ...CHART_AXIS_PROPS.tick, textAnchor: "end" }}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          formatter={(value) => [value, valueLabel || dataKey]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
