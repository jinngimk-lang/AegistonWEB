import { describe, expect, it } from 'vitest';

import { formatDate, formatNewsDate, formatReading, formatSlides } from '@/lib/format';

describe('format', () => {
  it('把 ISO 日期格式化为 ref 的点分格式', () => {
    expect(formatDate('2026-08-01')).toBe('2026.08.01');
  });

  it('新闻列表日期拆成月份与年月', () => {
    expect(formatNewsDate('2026-08-01')).toEqual({ month: '08', label: '2026.08' });
  });

  it('把页码渲染成可回源的溯源标注', () => {
    expect(formatSlides([3, 4, 5])).toBe('PPT p.3 / p.4 / p.5');
    expect(formatSlides([])).toBe('');
  });

  it('阅读时长', () => {
    expect(formatReading(5)).toBe('约 5 分钟');
  });
});
