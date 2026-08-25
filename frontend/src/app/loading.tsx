/** 骨架屏。沿用同一视觉：Hero 占位 + 三段区块占位。 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">页面加载中</span>
      <div className="skeleton" style={{ height: 340 }} />
      <section className="section">
        <div className="container">
          <div className="skeleton" style={{ height: 22, width: 180, marginBottom: 18 }} />
          <div className="skeleton" style={{ height: 44, width: '60%', marginBottom: 18 }} />
          <div className="skeleton" style={{ height: 18, width: '80%', marginBottom: 48 }} />
          <div className="card-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 320 }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
