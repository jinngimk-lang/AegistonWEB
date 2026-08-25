/**
 * 首页「私有化与一体机」区块（ref `.sustain`）。
 * `1fr 1fr / gap:72px`、`.sustain-visual{aspect-ratio:5/4}`、
 * icon 44×44 `var(--red-soft)` —— 原样沿用（spec §5.2）。
 */

import Image from 'next/image';

import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { stockSrc, type ResolvedMedia } from '@/lib/media';
import type { SustainBlockData } from '@/types/content';

const ICONS: Record<string, React.ReactNode> = {
  shield: (
    <>
      <path d="M12 2 L4 6 L4 12 C4 17 8 21 12 22 C16 21 20 17 20 12 L20 6 Z" />
      <path d="M9 12 L11 14 L15 10" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 L21 7.5 L12 12 L3 7.5 Z" />
      <path d="M3 12 L12 16.5 L21 12" />
      <path d="M3 16.5 L12 21 L21 16.5" />
    </>
  ),
  flow: (
    <>
      <rect x="3" y="4" width="7" height="6" />
      <rect x="14" y="14" width="7" height="6" />
      <path d="M6.5 10 L6.5 17 L14 17" />
    </>
  ),
};

export function SustainBlock({
  data,
  media,
}: {
  data: SustainBlockData;
  media: ResolvedMedia | null;
}) {
  return (
    <div className="sustain">
      <Reveal className="sustain-visual">
        {media ? (
          <Image
            src={'source' in media ? stockSrc(media, 1280) : media.src}
            alt=""
            role="presentation"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={media.blurDataUrl}
            style={{ objectFit: 'cover' }}
          />
        ) : null}
      </Reveal>

      <Reveal className="sustain-body" delay={1}>
        <div className="section-label">{data.eyebrow}</div>
        <h2 className="section-title">
          {data.titleLead}
          <br />
          <span className="em">{data.titleEm}</span>
        </h2>
        <p className="section-desc">{data.description}</p>

        <div className="sustain-points">
          {data.points.map((point) => (
            <div className="sustain-point" key={point.index}>
              <div className="sustain-point-icon" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {ICONS[point.icon ?? 'shield'] ?? ICONS.shield}
                </svg>
              </div>
              <div>
                <h5>{point.title}</h5>
                <p>{point.description}</p>
              </div>
            </div>
          ))}
        </div>

        <ButtonLink href={data.action.href} variant="primary" navy>
          {data.action.label}
        </ButtonLink>
      </Reveal>
    </div>
  );
}
