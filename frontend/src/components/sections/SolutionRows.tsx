/**
 * 首页三段左右交错的产品区块（ref `.solution`）。
 *
 * `1fr 1fr / gap:72px / margin-bottom:96px`、偶数行 `order` 互换、
 * `.solution-points` 的 2 列 + 上下 1px 边框、`.solution-visual` 的
 * `aspect-ratio:4/3` 与左下角 `.vlabel` —— 全部像素级沿用（spec §5.2）。
 *
 * `.solution-visual` 由 ref 的纯色块 + SVG 占位换成**真实产品截图**（G4）。
 */

import Image from 'next/image';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { stockSrc, type MediaLookup } from '@/lib/media';
import type { SolutionRow } from '@/types/content';

export function SolutionRows({ rows, media }: { rows: SolutionRow[]; media: MediaLookup }) {
  return (
    <>
      {rows.map((row) => {
        const asset = media.get(row.media);
        const visual = (
          <Reveal className="solution-visual" delay={1}>
            {asset ? (
              <Image
                src={'source' in asset ? stockSrc(asset, 1280) : asset.src}
                alt=""
                role="presentation"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                placeholder="blur"
                blurDataURL={asset.blurDataUrl}
                style={{ objectFit: 'cover' }}
              />
            ) : null}
            <span className="vlabel">{row.vlabel}</span>
          </Reveal>
        );

        return (
          <div className="solution" id={row.id} key={row.id}>
            <Reveal className="solution-body">
              <div className="tag-line">
                <span className="solution-code">{row.code}</span>
                <span className="solution-category">{row.category}</span>
              </div>
              <h3>{row.title}</h3>
              <span className="solution-en">{row.titleEn}</span>
              <p className="solution-desc">{row.description}</p>
              <div className="solution-points">
                {row.points.map((point) => (
                  <div className="solution-point" key={point}>
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
                    <span>{point}</span>
                  </div>
                ))}
              </div>
              <div className="solution-actions">
                <ButtonLink href={row.primary.href} variant="primary" compact>
                  {row.primary.label}
                </ButtonLink>
                {row.secondary ? (
                  <ButtonLink href={row.secondary.href} variant="text">
                    {row.secondary.label}
                  </ButtonLink>
                ) : null}
              </div>
            </Reveal>
            {visual}
          </div>
        );
      })}
    </>
  );
}
