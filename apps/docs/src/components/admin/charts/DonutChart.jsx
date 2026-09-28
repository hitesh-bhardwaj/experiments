"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  CHART_COLORS,
  CHART_TOOLTIP_CONTENT_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
} from "./ChartTheme";

// Plan-distribution donut. `data` is [{ name: "Pro", value: 12 }, ...].
export function DonutChart({ data, height = 220 }) {
  const total = (data || []).reduce((sum, item) => sum + (item.value || 0), 0);

  if (!total) {
    return (
      <div
        className="flex items-center justify-center text-sm text-white/40"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_CONTENT_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-medium font-laygrotesk text-white">
            {total}
          </span>
          <span className="text-xs text-white/40">total</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {data.map((entry, index) => (
          <span
            key={entry.name}
            className="flex items-center gap-1.5 text-xs text-white/60"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            {entry.name} ({entry.value})
          </span>
        ))}
      </div>
    </div>
  );
}
