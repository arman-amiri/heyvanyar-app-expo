const MAX_AD_PRICE = 100_000_000_000;

const ones = [
  '',
  'یک',
  'دو',
  'سه',
  'چهار',
  'پنج',
  'شش',
  'هفت',
  'هشت',
  'نه',
];

const teens = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];

const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = [
  '',
  'صد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];
const scales = ['', 'هزار', 'میلیون', 'میلیارد'];

export function formatPriceWithCommas(value: string | number): string {
  const digits = String(value);
  if (!/^\d+$/.test(digits)) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function threeDigitNumberToWords(value: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;

  if (hundred > 0) parts.push(hundreds[hundred]);
  if (remainder >= 10 && remainder < 20) {
    parts.push(teens[remainder - 10]);
  } else {
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;
    if (ten > 0) parts.push(tens[ten]);
    if (one > 0) parts.push(ones[one]);
  }

  return parts.join(' و ');
}

export function priceToPersianWords(value: string | number): string {
  const normalized = String(value);
  if (!/^\d+$/.test(normalized)) return '';

  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AD_PRICE) return '';

  const parts: string[] = [];
  let remainder = amount;
  let scaleIndex = 0;

  while (remainder > 0) {
    const group = remainder % 1000;
    if (group > 0) {
      const groupWords = threeDigitNumberToWords(group);
      parts.unshift(scales[scaleIndex] ? `${groupWords} ${scales[scaleIndex]}` : groupWords);
    }
    remainder = Math.floor(remainder / 1000);
    scaleIndex += 1;
  }

  return `${parts.join(' و ')} تومان`;
}

export { MAX_AD_PRICE };
