function toPersianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) =>
    String.fromCharCode(0x06f0 + Number(digit)),
  );
}

export function formatPersianRelativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';

  const difference = Date.now() - timestamp;
  const isFuture = difference < 0;
  const elapsed = Math.abs(difference);
  const suffix = isFuture ? 'دیگر' : 'قبل';

  if (elapsed < 60_000) return isFuture ? 'به‌زودی' : 'لحظاتی پیش';

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه ${suffix}`;

  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت ${suffix}`;

  const days = Math.floor(elapsed / 86_400_000);
  if (days === 1) return isFuture ? 'فردا' : 'دیروز';
  if (days < 7) return `${toPersianDigits(days)} روز ${suffix}`;

  const weeks = Math.floor(days / 7);
  if (days < 30) return `${toPersianDigits(weeks)} هفته ${suffix}`;

  const months = Math.floor(days / 30);
  if (days < 365) return `${toPersianDigits(months)} ماه ${suffix}`;

  const years = Math.floor(days / 365);
  return `${toPersianDigits(years)} سال ${suffix}`;
}
