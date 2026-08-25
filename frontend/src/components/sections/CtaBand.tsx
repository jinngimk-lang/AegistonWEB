/**
 * 底部 CTA（ref `.cta-band`）。
 *
 * ⚠️ ref 里 `.cta-band .btn-primary{background:var(--navy)}` 是跨组件后代
 * 选择器（CtaBand ↔ ui/Button）。两边的类名都必须留在全局层，否则 CSS Modules
 * 哈希后**永远匹配不到**，而且是静默失效（spec §9.3 / P0-2）。
 */

import { ButtonLink } from '@/components/ui/Button';
import type { CtaBlock } from '@/types/content';

export function CtaBand({ cta }: { cta: CtaBlock }) {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <div className="cta-inner">
        <h2 id="cta-title">{cta.title}</h2>
        {cta.description ? <p>{cta.description}</p> : null}
        <div className="cta-actions">
          <ButtonLink href={cta.primaryHref} variant="primary">
            {cta.primaryLabel}
          </ButtonLink>
          {cta.secondaryLabel && cta.secondaryHref ? (
            <ButtonLink href={cta.secondaryHref} variant="outline" arrow={false}>
              {cta.secondaryLabel}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
