/* 站点自检：链接可达性 / 锚点有效性 / id 唯一性 / 资源存在
   用法：node tools/check.mjs */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('_frozen-'));

let errors = 0;
let warnings = 0;

const err = (m) => { errors++; console.log('  ✗ ' + m); };
const warn = (m) => { warnings++; console.log('  ! ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

const ids = new Map();   // page -> Set(ids)
const anchors = new Map(); // page -> [{target, where}]

for (const page of PAGES) {
  const html = readFileSync(join(ROOT, page), 'utf8');

  // ---------- id 唯一性 ----------
  const found = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    if (found.has(m[1])) err(`${page}: id 重复 "${m[1]}"`);
    found.add(m[1]);
  }
  ids.set(page, found);

  // ---------- 引用的本地资源 ----------
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/.test(url)) continue;
    const [file] = url.split('#');
    if (!file) continue;
    const abs = resolve(ROOT, file);
    if (!existsSync(abs)) err(`${page}: 资源不存在 -> ${url}`);
  }

  // ---------- 收集锚点 ----------
  for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const [file, hash] = m[1].split('#');
    anchors.set(page + '::' + m[1], { page, file: file || page, hash });
  }
}

console.log('\n[1] 资源与 id');
if (!errors) ok(`${PAGES.length} 个页面，本地资源与 id 均正常`);

console.log('\n[2] 锚点解析');
let anchorBad = 0;
for (const { page, file, hash } of anchors.values()) {
  if (!PAGES.includes(file)) { err(`${page}: 锚点指向非站点页面 -> ${file}#${hash}`); anchorBad++; continue; }
  const target = ids.get(file);
  if (!target) { err(`${page}: 无法读取目标页 ${file}`); anchorBad++; continue; }
  if (!target.has(hash)) { err(`${page}: 锚点不存在 -> ${file}#${hash}`); anchorBad++; }
}
if (!anchorBad) ok(`${anchors.size} 个锚点全部可解析`);

console.log('\n[3] 导航一致性');
const NAV = ['index.html', 'about.html', 'admissions.html', 'dream-science.html', 'feedback.html'];
for (const page of PAGES) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const missing = NAV.filter((n) => !html.includes(`href="${n}"`));
  if (missing.length) warn(`${page}: 主导航缺少 ${missing.join(', ')}`);
  const cur = (html.match(/aria-current="page"/g) || []).length;
  if (cur !== 1) err(`${page}: aria-current="page" 出现 ${cur} 次（应为 1）`);
}
if (!errors) ok('导航链接与当前页标记正常');

console.log('\n[4] 结构完整性');
for (const page of PAGES) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const checks = [
    ['<!DOCTYPE html>', /^<!DOCTYPE html>/i],
    ['lang="zh-CN"', /<html lang="zh-CN">/],
    ['viewport', /name="viewport"/],
    ['title', /<title>[^<]+<\/title>/],
    ['description', /name="description"/],
    ['favicon', /favicon\.svg/],
    ['style.css', /assets\/style\.css/],
    ['app.js', /assets\/app\.js/],
    ['nav__toggle', /nav__toggle/],
    ['footer', /class="footer"/],
  ];
  for (const [label, re] of checks) {
    if (!re.test(html)) err(`${page}: 缺少 ${label}`);
  }
  const openMain = (html.match(/<main>/g) || []).length;
  const closeMain = (html.match(/<\/main>/g) || []).length;
  if (openMain !== 1 || closeMain !== 1) err(`${page}: <main> 标签不配对 (${openMain}/${closeMain})`);
  const openSec = (html.match(/<section[ >]/g) || []).length;
  const closeSec = (html.match(/<\/section>/g) || []).length;
  if (openSec !== closeSec) err(`${page}: <section> 不配对 (${openSec}/${closeSec})`);
}
if (!errors) ok('页面结构检查通过');

console.log('\n[5] 表单完整性 (feedback.html)');
{
  const html = readFileSync(join(ROOT, 'feedback.html'), 'utf8');
  const need = ['feedback-form', 'form-done', 'form-error', 'char-count', 'fb-subject', 'fb-message', 'fb-email'];
  for (const n of need) if (!html.includes(`id="${n}"`)) err(`feedback.html: 缺少 #${n}`);
  if (!ids.get('feedback.html').has('form')) err('feedback.html: 缺少锚点 #form');
  for (const n of ['rc-id', 'rc-kind', 'rc-prio', 'rc-anon', 'rc-time', 'form-again']) {
    if (!html.includes(`id="${n}"`)) err(`feedback.html: 回执缺少 #${n}`);
  }
  if (!errors) ok('表单与回执元素齐全');
}

console.log(`\n结果：${errors} 个错误，${warnings} 个警告`);
process.exit(errors ? 1 : 0);
