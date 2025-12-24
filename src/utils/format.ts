export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
export function formatNumber(num: number, locale = "pt-BR"): string {
  return num.toLocaleString(locale);
}
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
export function formatCurrency(value: number, currency = "BRL", locale = "pt-BR"): string {
  return value.toLocaleString(locale, { style: "currency", currency });
}
