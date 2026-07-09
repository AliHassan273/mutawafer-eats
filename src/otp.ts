export interface OtpRecord {
  code: string;
  expiresAt: number;
}

export function generateOtpCode(length = 6): string {
  const digits = Array.from({ length }, () => Math.floor(Math.random() * 10));
  return digits.join('');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, '').replace(/^00/, '+').replace(/^\+?20/, '0');
}

export function createOtpRecord(code: string, ttlMs = 5 * 60 * 1000, now = Date.now()): OtpRecord {
  return { code, expiresAt: now + ttlMs };
}

export function isOtpValid(record: OtpRecord | undefined, inputCode: string, now = Date.now()): boolean {
  if (!record) return false;
  if (!inputCode) return false;
  if (now > record.expiresAt) return false;
  return record.code === inputCode;
}