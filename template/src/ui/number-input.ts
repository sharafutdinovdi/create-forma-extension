const decimal = new Intl.NumberFormat("en-US", {
  useGrouping: false,
  maximumFractionDigits: 15,
});

export function parseDecimal(raw: string): number | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  // Grouping is forbidden: a single comma always means the decimal separator.
  return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(text)
    ? Number(text.replace(",", ".")) : NaN;
}

export function numberInput(id: string, label: string, initial: number) {
  const field = document.createElement("div");
  field.className = "field";
  const caption = document.createElement("label");
  caption.htmlFor = id;
  caption.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.type = "text";
  input.inputMode = "decimal";
  input.value = decimal.format(initial);
  input.setAttribute("aria-describedby", "number-help");
  const validate = () => {
    const value = parseDecimal(input.value);
    const valid = value !== undefined && Number.isFinite(value) && value >= 0;
    input.setCustomValidity(valid ? "" : "Enter a non-negative number with . or , and no grouping separators.");
    input.setAttribute("aria-invalid", String(!valid));
    return valid;
  };
  input.addEventListener("input", validate);
  input.addEventListener("change", () => {
    if (validate()) input.value = decimal.format(parseDecimal(input.value)!);
    else input.reportValidity();
  });
  field.append(caption, input);
  return { field, input };
}
