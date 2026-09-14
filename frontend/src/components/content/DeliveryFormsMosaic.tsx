import Image from 'next/image';

import styles from '@/components/content/DeliveryFormsMosaic.module.css';
import { Reveal } from '@/components/ui/Reveal';
import type { DeliveryForm } from '@/types/content';

const DELIVERY_MEDIA = [
  '/media/deployment/private-server-4x3.png',
  '/media/deployment/appliance-4x3.png',
  '/media/deployment/private-cloud-4x3.png',
] as const;

const DELIVERY_LABELS = ['ON-PREMISE', 'APPLIANCE', 'PRIVATE CLOUD'] as const;
const DISPLAY_ORDER = [1, 0, 2] as const;
const CLOUD_DEPLOYMENT_POINT = '支持公有云与私有云部署，按需适配企业网络与合规边界。';

interface Props {
  forms: DeliveryForm[];
}

export function DeliveryFormsMosaic({ forms }: Props) {
  return (
    <>
      <Reveal className="solutions-intro">
        <div className="section-label">DELIVERY FORMS</div>
        <h2 className="section-title" id="delivery-forms-title">
          三种交付形态
        </h2>
      </Reveal>

      <div className={styles.mosaic}>
        {DISPLAY_ORDER.map((index, slot) => {
          const form = forms[index];
          if (!form) return null;

          const displayName = index === 2 ? '云部署服务' : form.name;
          const displayPoints = index === 2 ? [...form.points, CLOUD_DEPLOYMENT_POINT] : form.points;
          const mediaSrc = DELIVERY_MEDIA[index];
          const areaClass = slot === 0 ? styles.feature : slot === 1 ? styles.primary : styles.secondary;

          return (
            <Reveal className={`${styles.card} ${areaClass}`} delay={slot === 0 ? 0 : 1} key={form.index}>
              <div className={styles.visual}>
                <Image
                  src={mediaSrc}
                  alt=""
                  role="presentation"
                  fill
                  sizes={slot === 0 ? '(max-width: 900px) 100vw, 55vw' : '(max-width: 900px) 100vw, 24vw'}
                  style={{ objectFit: 'cover' }}
                />
                <span className={styles.vlabel}>
                  DELIVERY {form.index} / {DELIVERY_LABELS[index]}
                </span>
              </div>

              <div className={styles.body}>
                <div className={styles.tagLine}>
                  <span className={styles.code}>形态 {form.index}</span>
                  <span className={styles.category}>{form.fit}</span>
                </div>
                <h3>{displayName}</h3>
                <ul className={styles.points}>
                  {displayPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <dl className={styles.fit}>
                  <dt>适用</dt>
                  <dd>{form.fit}</dd>
                </dl>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
