/**
 * 三个自家产品的横向能力矩阵（v3 spec §4.4 / M3）。
 *
 * **合规设计**（CLAUDE.md §4）：
 * - 列 = 本家三个产品，**不含任何第三方主体**。竞品对照不上公开页 ——
 *   其中的评价性措辞可能触及《反不正当竞争法》第十一条与《广告法》第十三条。
 * - 取值三档 `core` / `supported` / `none`，**没有「规划中」**：前瞻性表述
 *   在广告法语境下是承诺，而 PPT 里没有可溯源的路线图口径（决策 A-7）。
 * - `none` 渲染为「—」并附视觉隐藏的「未覆盖」，**不用 ✗ 或任何否定性图形**：
 *   同一家公司的产品分层是定位差异，不是优劣评价。
 * - 每行 `sourceSlides` 必填**并在页面上实际渲染**。
 *
 * **可访问性**：语义化 `<table>` + 视觉隐藏 `<caption>`，行头 `th[scope=row]`、
 * 列头 `th[scope=col]`。不用 div 网格 —— 屏幕阅读器的表格导航（按行列朗读）
 * 正是这个组件唯一的价值所在。移动端外层 `role="region"` + `tabindex="0"`，
 * 让横向滚动键盘可达（WCAG 2.1 SC 2.1.1）。
 *
 * 复用全局 `.section-*` 家族 → 结构样式在 `sections-ext.css`（全局层）。
 */

import type { CapabilityLevel, CapabilityMatrix as MatrixData } from '@/types/content';

const LEVEL_TEXT: Record<CapabilityLevel, string> = {
  core: '核心能力',
  supported: '支持',
  none: '—',
};

/** 屏幕阅读器读到的说法。`none` 说「未覆盖」，不说「不支持」。 */
const LEVEL_SR: Record<CapabilityLevel, string> = {
  core: '核心能力',
  supported: '支持',
  none: '未覆盖',
};

interface Props {
  matrix: MatrixData;
  /** slug → 展示名，取自 `ProductsOverview.products`，不在这里硬编码产品名。 */
  productNames: { slug: string; name: string; tierLabel: string }[];
}

export function CapabilityMatrix({ matrix, productNames }: Props) {
  return (
    <div className="capability-matrix">
      <div
        className="matrix-scroll"
        role="region"
        aria-label="能力矩阵（可横向滚动）"
        tabIndex={0}
      >
        <table>
          <caption>
            {matrix.title}
            {matrix.description ? `：${matrix.description}` : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">能力</th>
              {productNames.map((product) => (
                <th scope="col" key={product.slug}>
                  {product.name}
                  <span className="matrix-note">{product.tierLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.capability}>
                <th scope="row">
                  <span className="matrix-capability">{row.capability}</span>
                  {row.note ? <span className="matrix-note">{row.note}</span> : null}
                  {/* 溯源必须**渲染在页面上**，不能只存在于 JSON 里 */}
                  <span className="matrix-slides">
                    PPT {row.sourceSlides.map((slide) => `p.${slide}`).join(' · ')}
                  </span>
                </th>
                {productNames.map((product) => {
                  const cell = row.cells.find((c) => c.productSlug === product.slug);
                  const level: CapabilityLevel = cell?.level ?? 'none';
                  return (
                    <td key={product.slug}>
                      <span className="matrix-cell" data-level={level}>
                        <span className="matrix-level">
                          {level !== 'none' ? (
                            <span className="matrix-dot" aria-hidden="true" />
                          ) : null}
                          <span aria-hidden="true">{LEVEL_TEXT[level]}</span>
                          <span className="visually-hidden">{LEVEL_SR[level]}</span>
                        </span>
                        {cell?.detail ? (
                          <span className="matrix-detail">{cell.detail}</span>
                        ) : null}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="matrix-hint">{matrix.sourceNote}</p>
    </div>
  );
}
