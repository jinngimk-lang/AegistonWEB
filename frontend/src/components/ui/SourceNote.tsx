/**
 * PPT 内容溯源元数据仍保留在内容层，但不再作为面向访客的页面文案展示。
 * 保留组件接口，避免改动各页面结构与内容数据。
 */
export function SourceNote({ slides }: { slides: readonly number[]; prefix?: string }) {
  if (slides.length === 0) return null;
  return null;
}
