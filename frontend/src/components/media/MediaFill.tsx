import Image from 'next/image';

import { stockSrc, type ResolvedMedia } from '@/lib/media';

interface Props {
  asset: ResolvedMedia | null;
  sizes?: string;
  width?: 1920 | 1280 | 768;
  priority?: boolean;
  alt?: string;
}

/**
 * 铺满父容器的装饰性图片。父容器负责 `position:relative` 与宽高比
 * （`.solution-visual` / `.sustain-visual` / `.card-media` 等全局类已定义）。
 * `alt=""` + `role="presentation"`：语义由相邻文本承担（spec §10.3）。
 */
export function MediaFill({ asset, sizes = '(max-width: 900px) 100vw, 50vw', width = 1280, priority, alt = '' }: Props) {
  if (!asset) return null;
  return (
    <Image
      src={'source' in asset ? stockSrc(asset, width) : asset.src}
      alt={alt}
      role={alt ? undefined : 'presentation'}
      fill
      sizes={sizes}
      priority={priority}
      placeholder="blur"
      blurDataURL={asset.blurDataUrl}
      style={{ objectFit: 'cover' }}
    />
  );
}
