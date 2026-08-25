/**
 * stylelint 护栏（spec §9.3 / P0-2）。
 *
 * 关键规则：`*.module.css` 中**禁止**出现 ref/1.html 已有的类名。
 * CSS Modules 会把类名哈希掉，ref 的跨元素后代选择器
 * （`.cta-band .btn-primary` / `.philosophy-head .section-label` / …）
 * 会**静默失效** —— 不报错、不告警、不进 lint，只是样式没生效。
 * 这条规则把它变成可见的红灯。
 */

/** ref/1.html 中出现过的类名。这批名字只能存在于全局层 src/styles/。 */
const REF_CLASS_NAMES = [
  'hero', 'hero-content', 'hero-text', 'hero-eyebrow', 'hero-sub', 'hero-cta',
  'domain', 'domains', 'domain-photo', 'domain-icon', 'domain-en', 'domain-link',
  'solution', 'solution-body', 'solution-visual', 'solution-code', 'solution-category',
  'solution-en', 'solution-desc', 'solution-points', 'solution-point', 'solution-actions',
  'solutions-intro',
  'value', 'values', 'value-num', 'value-en',
  'metric', 'metrics', 'metrics-grid', 'metric-num', 'metric-label',
  'news-grid', 'news-item', 'news-feature', 'news-feature-img', 'news-date', 'news-list',
  'news-item-date', 'news-item-body', 'news-item-cat',
  'footer', 'footer-main', 'footer-col', 'footer-brand', 'footer-bottom', 'footer-bottom-links',
  'btn', 'btn-primary', 'btn-outline', 'btn-text',
  'section', 'section-gray', 'section-head', 'section-head-left',
  'section-label', 'section-title', 'section-desc', 'section-more',
  'utility-bar', 'utility-inner', 'utility-left', 'utility-right',
  'nav', 'nav-inner', 'nav-menu', 'nav-item', 'nav-actions', 'nav-search', 'nav-contact',
  'submenu', 'brand', 'brand-text', 'brand-mark', 'caret',
  'vlabel', 'reveal', 'reveal-d1', 'reveal-d2', 'reveal-d3', 'totop',
  'cta-band', 'cta-inner', 'cta-actions',
  'sustain', 'sustain-visual', 'sustain-body', 'sustain-points', 'sustain-point',
  'sustain-point-icon',
  'philosophy', 'philosophy-head', 'philosophy-inner',
  'container', 'tag-line', 'check', 'arrow', 'em', 'unit', 'icp', 'sep', 'lang', 'lang-en',
  'ext', 'quote', 'dot',
];

// 整词匹配：`.nodeText` 不应被 `node` 之类的前缀误判；
// 同时覆盖后代 / 子代选择器里的出现位置。
const REF_CLASS_PATTERN = `/(^|[\s>+~])\.(${REF_CLASS_NAMES.join('|')})(?![\w-])/`;

export default {
  extends: ['stylelint-config-standard'],
  // fonts.css 及其拆分产物由 scripts/fetch-fonts.mjs / pick-preload-fonts.mjs 生成，
  // 与 Google Fonts CSS2 逐字一致（含无引号 url()），不参与格式规则。
  ignoreFiles: [
    '**/node_modules/**',
    '.next/**',
    'src/styles/fonts.css',
    'src/styles/fonts-critical.css',
  ],
  rules: {
    'custom-property-empty-line-before': null,
    'declaration-empty-line-before': null,
    'comment-empty-line-before': null,
    'rule-empty-line-before': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'alpha-value-notation': null,
    'color-function-notation': null,
    'color-hex-length': null,
    'number-max-precision': null,
    'media-feature-range-notation': null,
    'declaration-block-single-line-max-declarations': null,
    'value-keyword-case': null,
    'shorthand-property-no-redundant-values': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'font-family-name-quotes': null,
    'at-rule-empty-line-before': null,
  },
  overrides: [
    {
      files: ['src/**/*.module.css'],
      rules: {
        'selector-disallowed-list': [
          [REF_CLASS_PATTERN],
          {
            message:
              'ref/1.html 的类名必须留在全局层 src/styles/sections.css：CSS Modules 会哈希类名，' +
              'ref 的跨元素后代选择器会静默失效（spec §9.3 样式分层策略 / P0-2）',
          },
        ],
      },
    },
    {
      files: ['src/**/*.module.css'],
      rules: {
        // :global 是 CSS Modules 的合法语法
        'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
      },
    },
    {
      files: ['src/app/globals.css'],
      rules: {
        // 分层导入用裸字符串形式，便于逐行 diff 层叠顺序
        'import-notation': null,
      },
    },
  ],
};
