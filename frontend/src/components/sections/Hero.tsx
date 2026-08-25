/**
 * 首页 Hero（ref `.hero`）。
 *
 * 与 ref 的差异只有一处实现手段：ref 用 `background:url(...)` 把天际线挂在
 * `.hero` 上，本工程把位图交给 `next/image`（`.hero-bg`），以获得 AVIF/WebP、
 * 响应式 srcset 与 blur 占位。渐变遮罩 `::before`、3px 白色渐变线 `::after`、
 * `min-height:640px`、`clamp(36px,4.6vw,54px)` 等度量全部原样（spec §5.2）。
 *
 * 首屏图片：`priority` + `fetchPriority="high"`（spec §4.2 路径 A 第 7 步）。
 */

import Image from 'next/image';

import { ButtonLink } from '@/components/ui/Button';
import { stockSrc, type ResolvedMedia } from '@/lib/media';
import type { HeroBlock } from '@/types/content';

interface Props {
  hero: HeroBlock;
  media: ResolvedMedia | null;
}

export function Hero({ hero, media }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      {media ? (
        <div className="hero-bg">
          <Image
            src={'source' in media ? stockSrc(media, 1920) : media.src}
            alt=""
            role="presentation"
            fill
            priority
            fetchPriority="high"
            quality={82}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={media.blurDataUrl}
          />
        </div>
      ) : null}

      <div className="container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="dot" aria-hidden="true" />
              <span>{hero.eyebrow}</span>
            </div>
            <h1 id="hero-title">
              {hero.titleLead}
              <br />
              {hero.titlePrefix}
              <span className="em">{hero.titleEm}</span>
            </h1>
            <p className="hero-sub">{hero.subtitle}</p>
            <div className="hero-cta">
              <ButtonLink href={hero.primary.href} variant="primary">
                {hero.primary.label}
              </ButtonLink>
              <ButtonLink href={hero.secondary.href} variant="outline" arrow={false}>
                {hero.secondary.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
