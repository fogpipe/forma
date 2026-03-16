import React from "react";
import type { MatrixComponentProps } from "../../types.js";

export function MatrixField({ field }: MatrixComponentProps) {
  const hasErrors = field.visibleErrors.length > 0;
  const visibleRows = field.rows.filter((r) => r.visible);
  const currentValue = field.value ?? {};

  const handleChange = (
    rowId: string,
    colValue: string | number,
  ) => {
    if (field.disabled) return;

    const next = { ...currentValue };
    if (field.multiSelect) {
      const current = (currentValue[rowId] ?? []) as string[];
      const colStr = String(colValue);
      const exists = current.includes(colStr);
      next[rowId] = exists
        ? current.filter((v) => v !== colStr)
        : [...current, colStr];
    } else {
      next[rowId] = colValue;
    }
    field.onChange(next as Record<string, string | number | string[] | number[]>);
    field.onBlur();
  };

  const isChecked = (
    rowId: string,
    colValue: string | number,
  ): boolean => {
    const rowValue = currentValue[rowId];
    if (rowValue === undefined || rowValue === null) return false;
    if (Array.isArray(rowValue)) {
      return (rowValue as (string | number)[]).includes(colValue);
    }
    return rowValue === colValue;
  };

  return (
    <div className="forma-matrix" aria-invalid={hasErrors || undefined}>
      <table className="forma-matrix__table" role="grid">
        <thead>
          <tr>
            <th scope="col" className="forma-matrix__corner" />
            {field.columns.map((col) => (
              <th
                key={String(col.value)}
                scope="col"
                className="forma-matrix__col-header"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.id} className="forma-matrix__row">
              <th scope="row" className="forma-matrix__row-header">
                {row.label}
              </th>
              {field.columns.map((col) => {
                const cellId = `${field.name}-${row.id}-${col.value}`;
                return (
                  <td key={String(col.value)} className="forma-matrix__cell">
                    <input
                      id={cellId}
                      type={field.multiSelect ? "checkbox" : "radio"}
                      name={
                        field.multiSelect
                          ? cellId
                          : `${field.name}-${row.id}`
                      }
                      className={
                        field.multiSelect
                          ? "forma-checkbox__input"
                          : "forma-radio__input"
                      }
                      checked={isChecked(row.id, col.value)}
                      onChange={() => handleChange(row.id, col.value)}
                      disabled={field.disabled}
                    />
                    <label htmlFor={cellId} className="forma-sr-only">
                      {row.label}: {col.label}
                    </label>
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
