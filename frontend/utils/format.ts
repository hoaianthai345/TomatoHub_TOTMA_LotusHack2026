export function formatCurrency(value?: number): string {
  if (!value) return "0 VND";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}