"use client";

import React from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizeColumns({ columns, headers, rows }) {
  if (Array.isArray(columns) && columns.length > 0) {
    if (typeof columns[0] === "string") {
      return columns.map((label) => ({ key: label, header: label }));
    }
    return columns;
  }

  if (Array.isArray(headers) && headers.length > 0) {
    return headers.map((label, idx) => ({ key: String(idx), header: label, index: idx }));
  }

  if (Array.isArray(rows) && rows.length > 0 && Array.isArray(rows[0])) {
    const maxLen = rows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
    return Array.from({ length: maxLen }, (_, idx) => ({
      key: String(idx),
      header: "",
      index: idx,
    }));
  }

  return [];
}

export default function DocsTable({
  columns,
  headers,
  rows = [],
  caption,
  colorVariant = "vault",
  className,
  tableClassName,
  headerRowClassName,
  bodyRowClassName,
  headerCellClassName,
  cellClassName,
  ...props
}) {
  const normalizedColumns = normalizeColumns({ columns, headers, rows });
  const variantClassName =
    colorVariant === "orange"
      ? "[--docs-table-border:rgba(255,95,0,0.32)] [--docs-table-header-bg:var(--primary)] [--docs-table-header-color:#0e0e0e] [--docs-table-cell-color:rgba(255,255,255,0.82)]"
      : colorVariant === "muted"
        ? "[--docs-table-border:rgba(147,147,147,0.28)] [--docs-table-header-bg:rgba(255,255,255,0.08)] [--docs-table-header-color:rgba(255,255,255,0.9)] [--docs-table-cell-color:rgba(255,255,255,0.68)]"
        : colorVariant === "outline"
          ? "[--docs-table-border:rgba(255,255,255,0.22)] [--docs-table-header-bg:transparent] [--docs-table-header-color:#fff] [--docs-table-cell-color:rgba(255,255,255,0.76)]"
          : // Default: the docs content sits on the light sheet - dark text and rules, dark header
            "[--docs-table-border:rgba(29,29,29,0.14)] [--docs-table-header-bg:rgb(0,0,0,0.8)] [--docs-table-header-color:#fff] [--docs-table-cell-color:rgba(29,29,29,0.82)]";

  return (
    <div
  className={cx(
    "w-full overflow-x-auto border border-(--docs-table-border) bg-transparent fadeup",
    variantClassName,
    className
  )}
  {...props}
>
  <table
    className={cx(
      "w-full min-w-[38rem] border-collapse text-left",
      tableClassName
    )}
  >
    {caption ? (
      <caption className="px-4 py-3 text-left text-sm text-[#6B6B6B]">
        {caption}
      </caption>
    ) : null}

    {normalizedColumns.length ? (
      <thead>
        <tr className={cx("align-top", headerRowClassName)}>
          {normalizedColumns.map((col, idx) => (
            <th
              key={col.key ?? idx}
              scope="col"
              className={cx(
                "bg-(--docs-table-header-bg) px-4 py-3.5 text-[1.2rem] font-medium text-(--docs-table-header-color) border-b border-(--docs-table-border)",
                idx !== normalizedColumns.length - 1 &&
                  "border-r border-(--docs-table-border)",
                col.headerClassName,
                headerCellClassName
              )}
            >
              {col.header ?? col.label ?? ""}
            </th>
          ))}
        </tr>
      </thead>
    ) : null}

    <tbody>
      {rows.map((row, rowIdx) => (
        <tr
          key={rowIdx}
          className={cx(
            "align-top border-b border-(--docs-table-border)",
            bodyRowClassName
          )}
        >
          {normalizedColumns.map((col, colIdx) => {
            let value;

            if (typeof col.render === "function") {
              value = col.render(row, rowIdx);
            } else if (Array.isArray(row)) {
              const index = col.index ?? colIdx;
              value = row[index];
            } else if (row && typeof row === "object") {
              value = row[col.key];
            } else {
              value = "";
            }

            return (
              <td
                key={col.key ?? colIdx}
                className={cx(
                  "px-4 py-3.5 text-sm md:text-base leading-relaxed text-(--docs-table-cell-color) border-(--docs-table-border)",
                  colIdx !== normalizedColumns.length - 1 &&
                    "border-r border-(--docs-table-border)",
                  col.cellClassName,
                  cellClassName
                )}
              >
                {value}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>
  );
}
