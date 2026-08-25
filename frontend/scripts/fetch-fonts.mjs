#!/usr/bin/env node
/**
 * 一次性下载字体分片到 public/fonts/ 并生成 src/styles/fonts.css（spec §5.3）。
 *
 *   node scripts/fetch-fonts.mjs --config font-manifest.json --out public/fonts
 *
 * 为什么不是 `next/font/google`：它确实在**运行期**自托管，但**构建期**仍要
 * 访问 fonts.googleapis.com / fonts.gstatic.com。客户在隔离网内执行
 * `docker build` 会直接失败，也与「CSP 无任何外部域白名单」的交付卖点不自洽。
 *
 * 为什么不是逐条手写 `next/font/local`：CJK 字体按 unicode-range 分片后是
 * 100+ 个 woff2 文件/字重，手写 src 数组不可维护。本脚本改为「下载官方
 * CSS2 → 重写 url() 为本地路径 → 落盘 fonts.css」，@font-face 与
 * unicode-range 与官方**逐字一致**，效果等价且可逐条 diff。
 * 见 spec「实施过程发现的方案缺陷」#4。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const args = parseArgs(process.argv.slice(2));
const configPath = args.config ?? 'font-manifest.json';
const outDir = args.out ?? 'public/fonts';
const cssOut = args.css ?? 'src/styles/fonts.css';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function log(message) {
  process.stdout.write(`[fonts] ${message}\n`);
}

function slug(family) {
  return family.toLowerCase().replace(/\s+/g, '-');
}

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(cssOut), { recursive: true });

  const chunks = [
    '/* ==========================================================================',
    '   自托管字体（由 scripts/fetch-fonts.mjs 生成，勿手改）',
    '   @font-face 与 unicode-range 与 Google Fonts CSS2 逐字一致，只把 url()',
    '   重写为本地 /fonts/*.woff2。构建期与运行期全程零外网（spec §5.3）。',
    '   ========================================================================== */',
    '',
  ];

  let downloaded = 0;
  let reused = 0;

  for (const family of config.families) {
    const query = `family=${encodeURIComponent(family.name)}:wght@${family.weights.join(';')}&display=swap`;
    const res = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) throw new Error(`CSS2 请求失败 ${res.status} → ${family.name}`);
    let css = await res.text();

    const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
    log(`${family.name}（${family.weights.join('/')}）：${urls.length} 个分片`);

    for (const url of urls) {
      const name = `${slug(family.name)}-${path.basename(new URL(url).pathname)}`;
      const dest = path.join(outDir, name);
      if (existsSync(dest)) {
        reused += 1;
      } else {
        const bin = await fetch(url, { headers: { 'User-Agent': UA } });
        if (!bin.ok) throw new Error(`分片下载失败 ${bin.status} → ${url}`);
        await writeFile(dest, Buffer.from(await bin.arrayBuffer()));
        downloaded += 1;
      }
      css = css.split(url).join(`/fonts/${name}`);
    }

    chunks.push(`/* --- ${family.name} · ${family.note ?? ''} --- */`, css.trim(), '');
  }

  await writeFile(cssOut, `${chunks.join('\n')}\n`, 'utf8');
  log(`完成：新下载 ${downloaded} 个，复用 ${reused} 个 → ${outDir}`);
  log(`样式表 → ${cssOut}`);
}

main().catch((error) => {
  log(`FATAL: ${error.message}`);
  log('字体缺失时站点仍可渲染（tokens.css 的字族已声明 PingFang SC / 微软雅黑等系统回退），');
  log('但与 ref/1.html 的排版会有偏差。请检查网络或代理后重跑：npm run fonts:fetch');
  process.exitCode = 1;
});
