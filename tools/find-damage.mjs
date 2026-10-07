/* 定位并报告 style.css 中被 Set-Content 损坏的字符（只读，不改文件）
   用法：node tools/find-damage.mjs */
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const buf = readFileSync(join(ROOT, 'assets', 'style.css'));

function seqLen(b) {
  if (b < 0x80) return 1;
  if (b >= 0xf0 && b <= 0xf4) return 4;
  if (b >= 0xe0 && b <= 0xef) return 3;
  if (b >= 0xc2 && b <= 0xdf) return 2;
  return -1;
}

const sites = [];
let i = 0;
while (i < buf.length) {
  const b = buf[i];
  if (b < 0x80) { i++; continue; }
  const len = seqLen(b);
  if (len < 0) { sites.push({ pos: i, len: 1, bytes: [b] }); i++; continue; }
  let ok = true;
  for (let k = 1; k < len; k++) {
    const c = buf[i + k];
    if (c === undefined || c < 0x80 || c > 0xbf) { ok = false; break; }
  }
  if (ok) { i += len; continue; }
  // 找出真正破损的长度：合法前导 + 后续被替换为 0x3F 的字节
  let realLen = len;
  sites.push({ pos: i, len: realLen, bytes: Array.from(buf.slice(i, i + realLen)) });
  i += realLen;
}

console.log(`损坏点：${sites.length}\n`);
sites.forEach((s, n) => {
  const lo = Math.max(0, s.pos - 55);
  const hi = Math.min(buf.length, s.pos + s.len + 30);
  const ctx = buf.slice(lo, hi).toString('utf8').replace(/\n/g, '\\n');
  console.log(`--- ${n + 1} @ byte ${s.pos} ---`);
  console.log(`  原始字节: ${s.bytes.map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`);
  console.log(`  上下文  : ${ctx}`);
  console.log('');
});
