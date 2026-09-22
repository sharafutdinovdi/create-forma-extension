import { formatNumber } from "forma-extension-kit";

export function metricRow(label: string, unit = "") {
  const row = document.createElement("div");
  row.className = "metric";
  const caption = document.createElement("span");
  caption.textContent = label;
  const value = document.createElement("span");
  value.className = "metric-value";
  const amount = document.createElement("span");
  const suffix = document.createElement("span");
  suffix.className = "unit";
  suffix.textContent = unit ? ` ${unit}` : "";
  value.append(amount, suffix);
  row.append(caption, value);
  return { row, set: (number: number | null) => { amount.textContent = number === null ? "—" : formatNumber(number); } };
}
