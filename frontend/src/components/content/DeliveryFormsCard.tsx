import type { DeliveryForm } from '@/types/content';

import styles from './DeliveryFormsCard.module.css';

interface DeliveryFormsCardProps {
  forms: DeliveryForm[];
}

const DISPLAY_ORDER = ['便携式一体机', '私有化服务器部署', '私有云服务'] as const;

function orderedForms(forms: DeliveryForm[]): DeliveryForm[] {
  const byName = new Map(forms.map((form) => [form.name, form]));
  return DISPLAY_ORDER.flatMap((name) => {
    const form = byName.get(name);
    return form ? [form] : [];
  });
}

function displayName(name: string): string {
  return name === '私有云服务' ? '云部署服务' : name;
}

export function DeliveryFormsCard({ forms }: DeliveryFormsCardProps) {
  const rows = orderedForms(forms);

  return (
    <div className={styles.shell}>
      <table className={styles.table} aria-label="三种交付形态对比">
        <colgroup>
          <col className={styles.modeColumn} />
          <col className={styles.featureColumn} />
          <col className={styles.fitColumn} />
        </colgroup>
        <thead className={styles.head}>
          <tr>
            <th scope="col">部署方式</th>
            <th scope="col">具体功能</th>
            <th scope="col">使用场景</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((form) => (
            <tr className={styles.row} key={form.index}>
              <th className={styles.modeCell} scope="row">
                <span className={styles.modeWrap}>
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                  <span className={styles.modeName}>{displayName(form.name)}</span>
                </span>
              </th>
              <td className={styles.featureCell} data-label="具体功能">
                <ul className={styles.featureList}>
                  {form.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </td>
              <td className={styles.fitCell} data-label="使用场景">
                {form.fit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
