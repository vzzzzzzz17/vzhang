import { createHmac, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(bytes) {
  let bits = 0;
  let accumulator = 0;
  let encoded = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += alphabet[(accumulator >>> bits) & 31];
    }
    accumulator &= (1 << bits) - 1;
  }
  if (bits) encoded += alphabet[(accumulator << (5 - bits)) & 31];
  return encoded;
}

export function decodeBase32(encoded) {
  if (!/^[A-Z2-7]{32}$/.test(encoded)) throw new Error("Invalid authenticator secret configuration.");
  let bits = 0;
  let accumulator = 0;
  const bytes = [];
  for (const character of encoded) {
    accumulator = (accumulator << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >>> bits) & 255);
    }
    accumulator &= (1 << bits) - 1;
  }
  return Buffer.from(bytes);
}

export function generateCode(secret, counter, digits = 6) {
  if (!Number.isSafeInteger(counter) || counter < 0) throw new Error("Invalid authenticator counter.");
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const truncated = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(truncated % (10 ** digits)).padStart(digits, "0");
}

export function matchCode(secret, code, timestamp = Date.now()) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null;
  const currentCounter = Math.floor(timestamp / 30000);
  const candidate = Buffer.from(code, "ascii");
  let matched = null;
  for (const counter of [currentCounter - 1, currentCounter, currentCounter + 1]) {
    if (counter < 0) continue;
    const expected = Buffer.from(generateCode(secret, counter), "ascii");
    if (timingSafeEqual(candidate, expected)) matched = counter;
  }
  return matched;
}
