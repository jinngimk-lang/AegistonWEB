#!/usr/bin/env node
/**
 * 下载并本地化 Unsplash / Wikimedia 配图，并登记本地生成素材（spec §6.3）。
 *
 *   node scripts/fetch-stock-images.mjs --config stock-images.json --out public/media/stock
 *
 * 产出：
 *   - public/media/stock/<id>-{1920,1280,768}.webp
 *   - backend/app/content/stock_credits.json（署名与许可证，页脚「图片来源」页展示）
 *
 * 运行期不依赖外部 CDN —— 这是私有化交付的硬要求，也是 CSP 能做到
 * `default-src 'self'` 无任何外部域白名单的前提（spec §11.3）。
 *
 * `source=generated` 的素材由项目本地提供：脚本只读取现有 WebP 生成署名元数据，
 * 即使传入 --force 也不会联网覆盖；若主文件缺失则明确失败。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const args = parseArgs(process.argv.slice(2));
const configPath = args.config ?? 'stock-images.json';
const outDir = args.out ?? 'public/media/stock';
const creditsPath =
  args.credits ?? path.join('..', 'backend', 'app', 'content', 'stock_credits.json');
const force = Boolean(args.force);

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
  process.stdout.write(`[stock] ${message}\n`);
}

function sourceUrl(asset, width) {
  if (asset.source === 'generated') {
    throw new Error(`${asset.id} 是本地生成素材，不允许通过网络重新下载`);
  }
  if (asset.url) return asset.url;
  return `https://images.unsplash.com/${asset.photoId}?auto=format&fit=crop&w=${width}&q=82`;
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      // Wikimedia 对无 UA 的请求返回 403
      'User-Agent': 'aegiston-site-build/1.0 (+https://github.com/aegiston) node-fetch',
      Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} → ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function blurDataUrl(buffer) {
  const tiny = await sharp(buffer).resize(8, 8, { fit: 'cover' }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${tiny.toString('base64')}`;
}

async function creditFromExisting(asset, primaryWidth, primaryFile) {
  const buffer = await readFile(primaryFile);
  const meta = await sharp(buffer).metadata();
  return buildCredit(asset, primaryWidth, meta.width, meta.height, await blurDataUrl(buffer));
}

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const widths = config.widths ?? [1920, 1280, 768];
  const quality = config.quality ?? 82;
  await mkdir(outDir, { recursive: true });

  const credits = [];
  let failed = 0;

  for (const asset of config.assets) {
    const primaryWidth = widths[0];
    const primaryFile = path.join(outDir, `${asset.id}-${primaryWidth}.webp`);

    if (asset.source === 'generated') {
      if (!existsSync(primaryFile)) {
        failed += 1;
        log(`! ${asset.id}: 本地生成素材缺失 —— ${primaryFile}`);
        continue;
      }
      credits.push(await creditFromExisting(asset, primaryWidth, primaryFile));
      log(`· ${asset.id}: 本地生成素材，保留现有文件`);
      continue;
    }

    if (existsSync(primaryFile) && !force) {
      credits.push(await creditFromExisting(asset, primaryWidth, primaryFile));
      log(`· ${asset.id}: 已存在，跳过（--force 可强制重下）`);
      continue;
    }

    try {
      const raw = await download(sourceUrl(asset, primaryWidth));
      let primaryMeta = null;
      for (const width of widths) {
        const dest = path.join(outDir, `${asset.id}-${width}.webp`);
        const info = await sharp(raw)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toFile(dest);
        if (width === primaryWidth) primaryMeta = info;
      }
      const blur = await blurDataUrl(raw);
      credits.push(buildCredit(asset, primaryWidth, primaryMeta.width, primaryMeta.height, blur));
      log(`· ${asset.id}: ${primaryMeta.width}x${primaryMeta.height}，${widths.length} 档 WebP`);
    } catch (error) {
      failed += 1;
      log(`! ${asset.id}: 下载失败 —— ${error.message}`);
    }
  }

  if (credits.length === 0) {
    log('ERROR: 没有任何配图可用，终止（内容包会因引用缺失而拒绝启动）');
    process.exitCode = 1;
    return;
  }

  await mkdir(path.dirname(creditsPath), { recursive: true });
  await writeFile(
    creditsPath,
    `${JSON.stringify(
      {
        _note: '由 frontend/scripts/fetch-stock-images.mjs 生成，勿手改',
        _license:
          'Unsplash License 不强制署名；Wikimedia 素材按各自许可登记；本地生成素材不依赖外部图片授权源。',
        assets: credits,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  log(`完成：${credits.length}/${config.assets.length} 张，署名清单 → ${creditsPath}`);
  if (failed > 0) {
    log(`WARN: ${failed} 张失败，请检查本地素材、网络或代理后重跑`);
    process.exitCode = 1;
  }
}

function buildCredit(asset, width, realWidth, realHeight, blur) {
  return {
    id: asset.id,
    src: `/media/stock/${asset.id}-${width}.webp`,
    width: realWidth,
    height: realHeight,
    blurDataUrl: blur,
    alt: asset.alt,
    source: asset.source,
    photoId: asset.photoId,
    author: asset.author ?? null,
    authorUrl: asset.authorUrl ?? null,
    license: asset.license,
    licenseUrl: asset.licenseUrl ?? null,
    originUrl:
      asset.originUrl ??
      (asset.source === 'unsplash'
        ? `https://unsplash.com/photos/${String(asset.photoId).replace(/^photo-/, '')}`
        : null),
  };
}

main().catch((error) => {
  log(`FATAL: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
