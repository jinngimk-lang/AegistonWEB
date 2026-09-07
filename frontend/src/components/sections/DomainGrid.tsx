/**
 * 业务领域四宫格（ref `.domains` / `.domain` / `.domain-photo`）。
 * 1px 分隔栅格、顶部 3px 红条 `scaleX(0)→1`、`.domain-photo` 的
 * `height:168px; margin:0 -28px 26px` 全部原样（spec §5.2）。
 *
 * 图片换成 PPT 里的**真实产品截图**（G4），只有「私有化交付」一格用 Unsplash。
 */

import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { stockSrc, type MediaLookup } from '@/lib/media';
import type { DomainCard } from '@/types/content';

export function DomainGrid({ domains, media }: { domains: DomainCard[]; media: MediaLookup }) {
  return (
    <div className="domains">
      {domains.map((domain, index) => {
        const asset = media.get(domain.media);
        return (
          <Reveal key={domain.id} delay={(index % 4) as 0 | 1 | 2 | 3} className="domain">
            <div className={`domain-photo ${domain.photoClass}`} aria-hidden="true">
              {asset ? (
                <Image
                  src={'source' in asset ? stockSrc(asset, 768) : asset.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  placeholder="blur"
                  blurDataURL={asset.blurDataUrl}
                  style={{ objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <h3>{domain.title}</h3>
            <span className="domain-en">{domain.titleEn}</span>
            <p>{domain.description}</p>
            <Link href={domain.href} className="domain-link">
              了解详情 <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
