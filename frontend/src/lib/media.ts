import 'server-only';

import { getMediaManifest } from '@/lib/api';
import type { MediaAsset, StockCredit } from '@/types/content';

export type ResolvedMedia = MediaAsset | StockCredit;

export interface MediaLookup {
  get(id: string | null | undefined): ResolvedMedia | null;
  require(id: string): ResolvedMedia;
}

/**
 * 媒体清单查表器。
 *
 * 引用完整性已经在后端 `ContentRepository._check_references()` 里做过一次
 * （任何 mediaId 指向不存在的资源都会让进程拒绝启动），所以这里拿不到值
 * 只可能是快照降级路径上的边界情况 —— 返回 null 让调用方跳过渲染，
 * 而不是抛错让整页 500。
 */
export async function getMediaLookup(): Promise<MediaLookup> {
  const manifest = await getMediaManifest();
  const map = new Map<string, ResolvedMedia>();
  for (const asset of manifest.assets) map.set(asset.id, asset);
  for (const credit of manifest.stock) map.set(credit.id, credit);

  return {
    get(id) {
      if (!id) return null;
      return map.get(id) ?? null;
    },
    require(id) {
      const found = map.get(id);
      if (!found) throw new Error(`媒体资源不存在：${id}`);
      return found;
    },
  };
}

export function isVideo(asset: ResolvedMedia | null): asset is MediaAsset {
  return Boolean(asset && 'kind' in asset && asset.kind === 'video' && asset.videoSrc);
}

export function isScreenshot(asset: ResolvedMedia | null): boolean {
  return Boolean(asset && 'kind' in asset && (asset.kind === 'screenshot' || asset.kind === 'diagram'));
}

/** stock 图有 1920 / 1280 / 768 三档，按需要挑一档作为 next/image 的 src。 */
export function stockSrc(asset: ResolvedMedia, width: 1920 | 1280 | 768): string {
  if (!('source' in asset)) return asset.src;
  return asset.src.replace(/-\d+\.webp$/, `-${width}.webp`);
}
