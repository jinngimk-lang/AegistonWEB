/** 日期与数字格式化。全站统一 zh-CN / GMT+8 口径。 */

const DATE_FMT = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Shanghai',
});

/** `2026-08-01` → `2026.08.01` */
export function formatDate(iso: string): string {
  const parts = DATE_FMT.formatToParts(new Date(`${iso.slice(0, 10)}T00:00:00+08:00`));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')}`;
}

/** `2026-08-01` → `{ month: '08', label: '2026.08' }`，对应 ref 的 .news-item-date */
export function formatNewsDate(iso: string): { month: string; label: string } {
  const [year = '', month = ''] = iso.slice(0, 10).split('-');
  return { month, label: `${year}.${month}` };
}

/** 把 `[3, 4, 5]` 渲染成 `PPT p.3 / p.4 / p.5` */
export function formatSlides(slides: readonly number[]): string {
  if (slides.length === 0) return '';
  return `PPT ${slides.map((s) => `p.${s}`).join(' / ')}`;
}

/** 洞察阅读时长 */
export function formatReading(minutes: number): string {
  return `约 ${minutes} 分钟`;
}
