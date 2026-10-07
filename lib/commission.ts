export const PLATFORM_COMMISSION_RATE = 0.05;
export const AUTHOR_SHARE_RATE = 0.95;

export function calculateSale(amount: number) {
  const gross = Math.max(0, amount);
  const platformCommission = Number((gross * PLATFORM_COMMISSION_RATE).toFixed(2));
  const authorEarnings = Number((gross - platformCommission).toFixed(2));
  return { gross, platformCommission, authorEarnings };
}
