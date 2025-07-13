import crypto from 'crypto';
export const stringToNumber = (strNumber?: string): number | undefined => {
  if (strNumber === null || strNumber === undefined) return undefined;
  const strTypeof = typeof strNumber;
  if (strTypeof !== 'string' && strTypeof !== 'number') return undefined;
  if (strTypeof === 'string' && strNumber.trim() == '') return undefined;
  const number = 1 * (strNumber as unknown as number);
  return isNaN(number) ? undefined : number;
};
export function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}
