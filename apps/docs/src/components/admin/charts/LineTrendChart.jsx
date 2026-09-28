"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

// Time-series trend (signups/day, copies/day, revenue/day). `data` is a
// flat array of plain objects, e.g. [{ date: "Aug 1", value: 4 }, ...] -
// callers pre-format the x label so this stays a dumb rendering component.
//
// Pass `series` (an array of `{ dataKey, color, label }`) instead of the
// single `dataKey`/`color`/`valueLabel` props to render more than one line
// off the same `data` array - e.g. one row per day shaped
// `{ label, web: 2, cli: 1, mcp: 0 }` with
// `series={[{ dataKey: "web", color: "#ff5f00", label: "web" }, ...]}`, used
// by the per-user Activity detail's Installs chart (web/CLI/MCP).
export function LineTrendChart({
  data,
  xKey = "date",
  dataKey = "value",
  color = "#ff5f00",
  height = 220,
  valueLabel,
  series,
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

  const lines = series?.length ? series : [{ dataKey, color, label: valueLabel || dataKey }];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...CHART_GRID_PROPS} />
        <XAxis dataKey={xKey} {...CHART_AXIS_PROPS} />
        <YAxis allowDecimals={false} {...CHART_AXIS_PROPS} width={32} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          formatter={(value, name) => [value, lines.find((line) => line.dataKey === name)?.label || name]}
          cursor={{ stroke: "rgba(255,255,255,0.15)" }}
        />
        {series?.length > 1 && (
          <Legend
            formatter={(value) => lines.find((line) => line.dataKey === value)?.label || value}
            wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
          />
        )}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.dataKey}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
