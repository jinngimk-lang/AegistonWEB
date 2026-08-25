/** 跳过导航。每页第一个可聚焦元素（spec §5.3 / §10.3 键盘可达）。 */
export function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      跳到主要内容
    </a>
  );
}
