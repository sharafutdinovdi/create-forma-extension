import { formatNumber, parseNumber } from "forma-extension-kit";

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
  input.value = formatNumber(initial);
  input.setAttribute("aria-describedby", "number-help");
  const validate = () => {
    const value = parseNumber(input.value);
    const valid = value !== null && value >= 0;
    input.setCustomValidity(valid ? "" : "Enter a non-negative number with . or , and no grouping separators.");
    input.setAttribute("aria-invalid", String(!valid));
    return valid;
  };
  input.addEventListener("input", validate);
  input.addEventListener("change", () => {
    if (validate()) input.value = formatNumber(parseNumber(input.value)!);
    else input.reportValidity();
  });
  field.append(caption, input);
  return { field, input };
}
