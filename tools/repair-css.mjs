/* 修复 style.css 中被 Set-Content 损坏的 17 个字符。
   损坏模式：3 字节 UTF-8 字符的第 3 字节被替换为 0x3F('?')，前两字节保留。
   依据「前两字节 + 上下文」唯一确定原字符，按字节偏移精确回填。
   用法：node tools/repair-css.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'assets', 'style.css');
const buf = readFileSync(FILE);

/* 偏移 -> 正确字符（偏移由 tools/find-damage.mjs 报告） */
const FIXES = [
  [122, '—'],  // 主色：白 — Design System
  [175, '色'],  // 辅色：光谱彩色
  [354, '色'],  // 中性：白为主色
  [627, '谱'],  // 辅色：梦境光谱
  [1594, '素'], // 圆角仅用于极小元素
  [1903, '面'], // 各页面 / 各组件主题色
  [5390, '）'], // （用于子页页头，需完整淡出以免出现硬边）
  [8477, '度'], // 顶部进度条
  [10277, '态'], // 文件头：档案编号 + 状态
  [11581, '文'], // 首页首屏：正文 + 信息表
  [12028, '式'], // （Wikipedia 式 infobox）
  [12038, '）'], // （Wikipedia 式 infobox）
  [15221, '）'], // （招生页受理状态等）
  [15908, '字'], // 不用彩色大数字
  [18799, '条'], // 编号列表式条目
  [38780, '）'], // （断点由宽到窄……以便自然覆盖）
  [40262, '的'], // 单列统计需覆盖 920px 断点的 nth-child
];

// 自检：每个偏移处必须是 3 字节序列且第 3 字节为 0x3F
const problems = [];
for (const [pos, ch] of FIXES) {
  const a = buf[pos], b = buf[pos + 1], c = buf[pos + 2];
  const isLead3 = a >= 0xe0 && a <= 0xef;
  const isCont = b >= 0x80 && b <= 0xbf;
  if (!isLead3 || !isCont || c !== 0x3f) {
    problems.push(`${pos}: 期望 3 字节 + '?'，实际 ${[a, b, c].map((x) => x.toString(16)).join(' ')}`);
  }
  if (Buffer.byteLength(ch, 'utf8') !== 3) {
    problems.push(`${pos}: 替换字符「${ch}」不是 3 字节`);
  }
}
if (problems.length) {
  console.error('自检失败，未修改文件：');
  problems.forEach((p) => console.error('  - ' + p));
  process.exit(1);
}

// 按偏移倒序回填，避免偏移位移
const out = Buffer.from(buf);
for (const [pos, ch] of [...FIXES].sort((x, y) => y[0] - x[0])) {
  const bytes = Buffer.from(ch, 'utf8');
  bytes.copy(out, pos);
}
writeFileSync(FILE, out);
console.log(`已修复 ${FIXES.length} 处，写回 ${out.length} 字节`);
