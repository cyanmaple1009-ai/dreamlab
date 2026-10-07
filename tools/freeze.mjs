/* 生成「动画冻结」副本，供无头浏览器截图校验使用（仅工具，不影响站点）
   用法：node tools/freeze.mjs  ->  在站点根目录输出 _frozen-*.html
   注意：副本必须与 assets/ 同级，否则相对路径的样式表无法加载，
        会导致校验截图丢失全部样式。 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CSS = `
<style id="freeze">
  .reveal{opacity:1!important;transform:none!important;transition:none!important;animation:none!important}
  *{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}
  .hero__canvas{display:none!important}
</style>`;

// 溢出探针：把横向溢出元素写进 DOM，便于 --dump-dom 读取
const PROBE_OFF = process.argv.includes('--no-probe');

const PROBE = PROBE_OFF ? '' : `
<script>
window.addEventListener('load', function () {
  var de = document.documentElement;
  var limit = de.clientWidth;
  var bad = [];
  document.querySelectorAll('body *').forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right > limit + 1 || r.left < -1) {
      bad.push((el.tagName.toLowerCase()) + '.' + (el.className || '-') +
        ' L' + Math.round(r.left) + ' R' + Math.round(r.right) + ' W' + Math.round(r.width));
    }
  });
  var out = document.createElement('div');
  out.id = 'PROBE';
  var sel = ['.brand__mark', '.brand__svg', '.dept__ico', '.form-done__ico svg',
             '.device__fig svg', '.nav__toggle', '.notice__ico', '.btn svg'];
  var dims = sel.map(function (s) {
    var el = document.querySelector(s);
    if (!el) return s + '=ABSENT';
    var cs = getComputedStyle(el);
    var r = el.getBoundingClientRect();
    return s + '=' + Math.round(r.width) + 'x' + Math.round(r.height) +
           '(w:' + cs.width + ')';
  });
  out.textContent = 'VP=' + limit + ' SW=' + de.scrollWidth + ' OF=' + (de.scrollWidth - limit) +
    ' TOGGLE=' + getComputedStyle(document.querySelector('.nav__toggle')).display +
    ' BAD=[' + bad.slice(0, 4).join(' | ') + '] || ' + dims.join('  ');
  out.setAttribute('style',
    'position:fixed;left:0;top:0;z-index:99999;width:100%;background:#000;color:#0f0;' +
    'font:10px/1.5 monospace;padding:6px;white-space:pre-wrap;word-break:break-all');
  document.body.appendChild(out);
});
</script>`;


// 冻结计数器：把 data-count 直接写成终值
const freezeCounters = (html) =>
  html.replace(/<span data-count="([\d.]+)"([^>]*)>([^<]*)<\/span>/g, (_m, v, attrs, _inner) => {
    const dec = /data-decimals="(\d+)"/.exec(attrs);
    const n = dec ? Number(v).toFixed(Number(dec[1])) : Number(v).toLocaleString('en-US');
    return `<span>${n}</span>`;
  });

for (const f of readdirSync(ROOT).filter((x) => x.endsWith('.html') && !x.startsWith('_frozen-'))) {
  let html = readFileSync(join(ROOT, f), 'utf8');
  html = freezeCounters(html);
  html = html.replace('</head>', CSS + '\n</head>');
  html = html.replace('</body>', PROBE + '\n</body>');
  writeFileSync(join(ROOT, '_frozen-' + f), html, 'utf8');
  console.log('frozen ->', '_frozen-' + f);
}
