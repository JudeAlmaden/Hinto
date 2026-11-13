/**
 * Local, collision-resistant row ids.
 *
 * Rows never leave the device, so a timestamp + random suffix is enough and
 * avoids pulling in a UUID native module for the MVP (plan D17).
 */

let sequence = 0;

export function createId(): string {
  sequence = (sequence + 1) % 1_679_616; // 36^4, keeps the suffix bounded
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  const counter = sequence.toString(36).padStart(4, '0');
  return `${time}-${random}-${counter}`;
}
