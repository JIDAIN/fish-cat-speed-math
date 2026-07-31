/** Toggle the leading negative sign without changing the entered magnitude. */
export function toggleSign(value: string): string {
  return value.startsWith("-") ? value.slice(1) : `-${value}`;
}

/** Add one decimal point, preserving valid intermediate states such as -0. */
export function appendDecimal(value: string): string {
  if (value.includes(".")) return value;
  if (value === "" || value === "-") return `${value}0.`;
  return `${value}.`;
}
