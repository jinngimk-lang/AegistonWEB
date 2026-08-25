/**
 * 合约智审系统总体架构（PPT p.65）。
 *
 * 原始素材是 `image94.emf`（EMF 矢量），Web 无法直接使用，光栅化后会模糊。
 * spec §6.4 的方案：**用 React + 内联 SVG 重绘**四层架构。
 * 重绘的收益：可响应式、可主题化（颜色全部走 CSS 变量）、可无障碍
 * （`<title>` / `<desc>` + `role="img"`），且不引入一张模糊的位图。
 */

import styles from '@/components/content/LegalLensArchitecture.module.css';

interface Layer {
  code: string;
  name: string;
  nodes: string[];
}

const LAYERS: Layer[] = [
  {
    code: 'L4 · 应用层',
    name: '应用层',
    nodes: ['智能审查', '简洁审查', '文稿智审', '标前评审', '上下游一致性', '资信审查', '合同生成', '知识库'],
  },
  {
    code: 'L3 · 核心服务层',
    name: '核心服务层',
    nodes: ['文档解析', '知识抽取', '语义检索', '知识图谱', '多智能体协同', '规则引擎', '幻觉检测'],
  },
  {
    code: 'L2 · 技术架构层',
    name: '技术架构层',
    nodes: ['前端框架', '后端服务', '向量索引', '图数据库', '对象存储', '部署与运维'],
  },
  {
    code: 'L1 · 基础层',
    name: '基础层',
    nodes: ['算力资源', '存储资源', '网络与安全', '信创软硬件栈'],
  },
];

const ROW_HEIGHT = 96;
const GAP = 14;
const WIDTH = 960;
const LABEL_WIDTH = 176;

export function LegalLensArchitecture() {
  const height = LAYERS.length * ROW_HEIGHT + (LAYERS.length - 1) * GAP;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-labelledby="arch-title arch-desc"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="arch-title">合约智审系统总体架构</title>
        <desc id="arch-desc">
          系统分为基础、技术架构、核心服务和应用四层。基础层提供算力和存储保障；技术架构层整合前后端与存储部署技术；核心服务层聚合解析、处理和智能模型能力；应用层覆盖智能审查、合同和资信等功能。
        </desc>

        {LAYERS.map((layer, rowIndex) => {
          const y = rowIndex * (ROW_HEIGHT + GAP);
          const inner = WIDTH - LABEL_WIDTH - 24;
          const perRow = Math.min(layer.nodes.length, 4);
          const rows = Math.ceil(layer.nodes.length / perRow);
          const nodeW = (inner - (perRow - 1) * 10) / perRow;
          const nodeH = (ROW_HEIGHT - 24 - (rows - 1) * 8) / rows;

          return (
            <g key={layer.code}>
              <rect
                x={0}
                y={y}
                width={WIDTH}
                height={ROW_HEIGHT}
                fill="var(--bg-gray)"
                stroke="var(--border)"
              />
              <rect x={0} y={y} width={4} height={ROW_HEIGHT} fill="var(--red)" />
              <text className={styles.layerLabel} x={22} y={y + 34}>
                {layer.code}
              </text>
              <text className={styles.layerName} x={22} y={y + 60}>
                {layer.name}
              </text>

              {layer.nodes.map((node, nodeIndex) => {
                const col = nodeIndex % perRow;
                const row = Math.floor(nodeIndex / perRow);
                const nx = LABEL_WIDTH + col * (nodeW + 10);
                const ny = y + 12 + row * (nodeH + 8);
                return (
                  <g key={node}>
                    <rect
                      x={nx}
                      y={ny}
                      width={nodeW}
                      height={nodeH}
                      fill="var(--white)"
                      stroke="var(--border-2)"
                    />
                    <text
                      className={styles.nodeText}
                      x={nx + nodeW / 2}
                      y={ny + nodeH / 2 + 4}
                      textAnchor="middle"
                    >
                      {node}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className={styles.notes}>
        <div className={styles.noteBlock}>
          <h4>总体架构说明</h4>
          <ul>
            <li>系统分为基础、技术、核心服务和应用四层。</li>
            <li>基础层提供算力和存储保障。</li>
            <li>技术架构层整合前后端与存储部署技术。</li>
            <li>核心服务层聚合解析、处理和智能模型能力。</li>
            <li>应用层覆盖智能审查、合同和资信等功能。</li>
          </ul>
        </div>
        <div className={styles.noteBlock}>
          <h4>核心能力亮点</h4>
          <ul>
            <li>集成多种主流大模型与智能体。</li>
            <li>支持文档解析、知识抽取等核心功能。</li>
            <li>多智能体协同，提升自动化处理水平。</li>
            <li>灵活部署，适配不同企业需求。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
