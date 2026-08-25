'use client';

/**
 * 截图导览（ScreenTour）+ 灯箱（spec §10.2）。
 *
 * 产品页的主体是「左侧要点 + 右侧真实截图」的交替式导览，直接复用 ref
 * `.solution` 的 `1fr 1fr / gap:72px / nth-child(even) order 互换` 布局
 * —— 因此本组件的结构样式在**全局层** `src/styles/sections-ext.css`
 * （`.screen-section` / `.screen-visual` / `.vlabel` …），不进 CSS Module。
 *
 * 要点：
 * - 截图容器 `aspect-ratio` 由 manifest 中的真实宽高推导，**避免 CLS**
 * - 截图带 1px `var(--border)` 边框 + `var(--shadow-md)`，左下角复用
 *   `.vlabel` 样式打「产品 · 界面」标签
 * - 点击放大：`<Lightbox>` 原生 `<dialog>`，`←/→` 在同一产品的截图间切换
 * - GIF 已在构建期转 MP4（`<video autoplay muted loop playsinline poster>`）
 */

import Image from 'next/image';
import { useState } from 'react';

import { Lightbox } from '@/components/media/Lightbox';
import { Reveal } from '@/components/ui/Reveal';
import type { MediaAsset, ScreenSection } from '@/types/content';

interface Props {
  sections: ScreenSection[];
  assets: Record<string, MediaAsset>;
  vlabelPrefix: string;
}

export function ScreenGallery({ sections, assets, vlabelPrefix }: Props) {
  const ordered = sections
    .map((section) => assets[section.mediaId])
    .filter((asset): asset is MediaAsset => Boolean(asset));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="screen-tour">
      {sections.map((section, position) => {
        const asset = assets[section.mediaId];
        if (!asset) return null;
        const galleryIndex = ordered.findIndex((a) => a.id === asset.id);
        const isVideo = asset.kind === 'video' && asset.videoSrc;
        const ratio = `${asset.width} / ${asset.height}`;

        return (
          <section
            key={section.id}
            id={section.id}
            className="screen-section"
            data-layout={section.layout === 'right' ? 'right' : 'left'}
            aria-labelledby={`${section.id}-title`}
          >
            <Reveal className="screen-body">
              <div className="screen-eyebrow">{section.eyebrow}</div>
              <h3 id={`${section.id}-title`}>{section.title}</h3>
              {section.description ? <p>{section.description}</p> : null}
              {section.points.length > 0 ? (
                <ul className="screen-points">
                  {section.points.map((point) => (
                    <li key={point} className="screen-point">
                      <CheckIcon />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.sourceSlide ? (
                <p className="screen-source">内容来源：PPT p.{section.sourceSlide}</p>
              ) : null}
            </Reveal>

            <Reveal className="screen-visual" delay={1}>
              <figure className="screen-figure">
                {isVideo ? (
                  <div className="screen-frame" style={{ aspectRatio: ratio }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={asset.videoSrc ?? undefined}
                      poster={asset.poster ?? asset.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      aria-label={asset.alt}
                    />
                    <span className="vlabel">{vlabelPrefix} / MOTION</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="screen-frame"
                    style={{ aspectRatio: ratio }}
                    onClick={() => setOpenIndex(galleryIndex)}
                    aria-label={`放大查看：${asset.caption ?? asset.alt}`}
                  >
                    <Image
                      src={asset.src}
                      alt={asset.alt}
                      width={asset.width}
                      height={asset.height}
                      placeholder="blur"
                      blurDataURL={asset.blurDataUrl}
                      sizes="(max-width: 900px) 100vw, 50vw"
                      loading={position < 2 ? 'eager' : 'lazy'}
                    />
                    <span className="vlabel">
                      {vlabelPrefix} / {section.eyebrow.replace(/\s·\s\d+$/, '')}
                    </span>
                  </button>
                )}
                <figcaption>{asset.caption ?? asset.alt}</figcaption>
              </figure>
            </Reveal>
          </section>
        );
      })}

      <Lightbox
        items={ordered}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="check"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden="true"
    >
      <path d="M3 9 L7 13 L15 5" />
    </svg>
  );
}
