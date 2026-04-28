export const formatMoneyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export const parseMoneyInput = (masked: string) =>
  Number(masked.replace(/\s/g, "")) || 0;

export const formatUzs = (value: number) =>
  `${Math.round(value).toLocaleString("ru-RU")} сум`;
