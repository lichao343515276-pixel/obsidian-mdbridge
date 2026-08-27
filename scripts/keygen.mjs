import { randomBytes } from "crypto";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PREFIX = "MDBR";
const SEPARATOR = "-";

function generateSegment(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function generateKey() {
  const seg1 = generateSegment(6);
  const seg2 = generateSegment(6);
  const seg3 = generateSegment(4);
  return `${PREFIX}${SEPARATOR}${seg1}${SEPARATOR}${seg2}${SEPARATOR}${seg3}`;
}

function generateKeys(count) {
  const keys = [];
  const seen = new Set();
  while (keys.length < count) {
    const key = generateKey();
    if (!seen.has(key)) {
      seen.add(key);
      keys.push({
        key,
        created: new Date().toISOString(),
        status: "unused",
      });
    }
  }
  return keys;
}

function formatTable(keys) {
  const header = "License Key                        | Status  | Created";
  const divider = "----------------------------------|---------|---------------------";
  const rows = keys.map((k) =>
    `${k.key.padEnd(34)}| ${k.status.padEnd(8)}| ${k.created.slice(0, 19)}`
  );
  return [header, divider, ...rows].join("\n");
}

function main() {
  const count = parseInt(process.argv[2] || "1", 10);
  if (isNaN(count) || count < 1 || count > 1000) {
    console.error("Usage: node scripts/keygen.mjs <count> (1-1000)");
    process.exit(1);
  }

  const keys = generateKeys(count);

  console.log(`Generated ${count} MDBridge Pro license key(s):\n`);
  console.log(formatTable(keys));

  const keysDir = "release";
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }

  const jsonPath = join(keysDir, `keys-${Date.now()}.json`);
  writeFileSync(jsonPath, JSON.stringify(keys, null, 2));
  console.log(`\nSaved to: ${jsonPath}`);

  const csvPath = join(keysDir, `keys-${Date.now()}.csv`);
  const csv = "key,status,created\n" + keys.map((k) => `${k.key},${k.status},${k.created}`).join("\n");
  writeFileSync(csvPath, csv);
  console.log(`CSV:     ${csvPath}`);
}

main();
