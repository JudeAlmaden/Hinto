/**
 * Generates the placeholder assets required by the config plugins (plan D12).
 *
 * Everything here is synthesised from code — no binary blobs checked in by hand
 * and no image dependencies. Replace the alarm sounds and icons with designed
 * artwork before release; the specs (sizes, formats) must stay the same.
 *
 * Usage: npm run assets:generate
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // no filter
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Renders a normalized shape with 4x4 supersampling for clean edges. */
function renderIcon(size, inside, color) {
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          if (inside(nx, ny)) hits += 1;
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = Math.round((255 * hits) / (SS * SS));
    }
  }

  return encodePng(size, size, rgba);
}

// --------------------------------------------------------------------- shapes

const circle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const houseShape = (x, y) => {
  if (y >= 0.14 && y <= 0.46) {
    const halfWidth = (y - 0.14) * 1.15 + 0.05;
    if (Math.abs(x - 0.5) <= halfWidth) return true;
  }
  if (y > 0.46 && y <= 0.84 && x >= 0.24 && x <= 0.76) {
    const inDoor = y >= 0.64 && x >= 0.43 && x <= 0.57;
    return !inDoor;
  }
  return false;
};

const pinShape = (x, y) => {
  if (y <= 0.46) return circle(x, y, 0.5, 0.4, 0.24);
  if (y <= 0.84) {
    const halfWidth = 0.24 * (1 - (y - 0.46) / 0.38);
    return Math.abs(x - 0.5) <= halfWidth;
  }
  return false;
};

const clockShape = (x, y) => {
  const d = Math.hypot(x - 0.5, y - 0.5);
  const ring = d >= 0.25 && d <= 0.33;
  const handUp = Math.abs(x - 0.5) <= 0.028 && y >= 0.33 && y <= 0.52;
  const handRight = Math.abs(y - 0.5) <= 0.028 && x >= 0.5 && x <= 0.66;
  return ring || handUp || handRight;
};

const gearShape = (x, y) => {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  if (r <= 0.12) return false; // hub hole
  if (r <= 0.3) return true;
  if (r <= 0.37) return Math.cos(angle * 8) > 0.45; // 8 teeth
  return false;
};

const bellShape = (x, y) => {
  if (circle(x, y, 0.5, 0.16, 0.055)) return true;
  if (y >= 0.2 && y <= 0.44 && circle(x, y, 0.5, 0.44, 0.26)) return true;
  if (y > 0.44 && y <= 0.68) {
    const halfWidth = 0.26 + (y - 0.44) * 0.45;
    return Math.abs(x - 0.5) <= Math.min(halfWidth, 0.36);
  }
  if (y > 0.68 && y <= 0.84 && circle(x, y, 0.5, 0.76, 0.075)) return true;
  return false;
};

// ----------------------------------------------------------------- PNG output

const WHITE = [255, 255, 255];

function write(path, buffer) {
  const target = join(ROOT, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  console.log(`wrote ${path} (${buffer.length} bytes)`);
}

write('assets/notifications/notification-icon.png', renderIcon(96, bellShape, WHITE));
write('assets/notifications/service-icon.png', renderIcon(96, bellShape, WHITE));

// Large icon: white bell on the brand blue, 64x64.
{
  const size = 64;
  const SS = 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          if (bellShape((nx - 0.5) / 0.72 + 0.5, (ny - 0.5) / 0.72 + 0.5)) hits += 1;
        }
      }
      const alpha = hits / (SS * SS);
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(32 + (255 - 32) * alpha);
      rgba[i + 1] = Math.round(138 + (255 - 138) * alpha);
      rgba[i + 2] = Math.round(239 + (255 - 239) * alpha);
      rgba[i + 3] = 255;
    }
  }
  write('assets/notifications/large-icon.png', encodePng(size, size, rgba));
}

// Tab icons ship at 1x/2x/3x so every density gets native artwork.
const tabIcons = {
  home: houseShape,
  places: pinShape,
  history: clockShape,
  settings: gearShape,
};

for (const [name, shape] of Object.entries(tabIcons)) {
  write(`assets/images/tabIcons/${name}.png`, renderIcon(96, shape, WHITE));
  write(`assets/images/tabIcons/${name}@2x.png`, renderIcon(192, shape, WHITE));
  write(`assets/images/tabIcons/${name}@3x.png`, renderIcon(288, shape, WHITE));
}

// --------------------------------------------------------------- WAV encoder

const SAMPLE_RATE = 44100;

function encodeWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

function fade(samples, ms = 6) {
  const count = Math.round((ms / 1000) * SAMPLE_RATE);
  for (let i = 0; i < count && i < samples.length; i += 1) {
    const gain = i / count;
    samples[i] *= gain;
    samples[samples.length - 1 - i] *= gain;
  }
  return samples;
}

function normalise(samples, peak = 0.9) {
  let max = 0;
  for (const sample of samples) max = Math.max(max, Math.abs(sample));
  if (max === 0) return samples;
  const scale = peak / max;
  return samples.map((sample) => sample * scale);
}

function tone(buffer, startSec, durationSec, frequency, gain = 1, decay = 0) {
  const start = Math.round(startSec * SAMPLE_RATE);
  const length = Math.round(durationSec * SAMPLE_RATE);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-decay * t);
    const index = start + i;
    if (index >= buffer.length) break;
    buffer[index] += Math.sin(2 * Math.PI * frequency * t) * gain * envelope;
  }
}

function makeClassic() {
  const buffer = new Float64Array(Math.round(2.0 * SAMPLE_RATE));
  const pattern = [880, 660];
  let cursor = 0;
  for (let repeat = 0; repeat < 2; repeat += 1) {
    for (const frequency of pattern) {
      tone(buffer, cursor, 0.3, frequency, 0.8);
      cursor += 0.4;
    }
  }
  return fade(normalise(Array.from(buffer)));
}

function makeChime() {
  const buffer = new Float64Array(Math.round(2.4 * SAMPLE_RATE));
  const notes = [1046.5, 1318.5, 1568.0];
  notes.forEach((frequency, index) => {
    tone(buffer, index * 0.18, 1.6, frequency, 0.6, 3.2);
  });
  return fade(normalise(Array.from(buffer)));
}

function makeBeep() {
  const buffer = new Float64Array(Math.round(2.0 * SAMPLE_RATE));
  for (let i = 0; i < 8; i += 1) {
    tone(buffer, i * 0.24, 0.12, 1000, 0.8);
  }
  return fade(normalise(Array.from(buffer)));
}

write('assets/sounds/alarm-classic.wav', encodeWav(makeClassic()));
write('assets/sounds/alarm-chime.wav', encodeWav(makeChime()));
write('assets/sounds/alarm-beep.wav', encodeWav(makeBeep()));
