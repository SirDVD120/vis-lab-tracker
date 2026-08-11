export function PageSkeleton({
  variant = "catalog",
}: {
  variant?: "home" | "catalog" | "detail" | "form";
}) {
  return (
    <main className="page-skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page…</span>
      <section className="page-hero">
        <div className="skeleton skeleton--eyebrow" />
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--lede" />
      </section>

      {variant === "home" ? (
        <>
          <div className="home-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton skeleton--card" />
            ))}
          </div>
          <div className="home-section">
            <div className="home-attention">
              <div className="skeleton skeleton--panel" />
              <div className="skeleton skeleton--panel" />
            </div>
          </div>
        </>
      ) : null}

      {variant === "catalog" ? (
        <>
          <div className="skeleton skeleton--toolbar" />
          <div className="skeleton skeleton--panel skeleton--panel-tall" />
        </>
      ) : null}

      {variant === "detail" ? (
        <div className="stack-sm item-detail">
          <div className="skeleton skeleton--badges" />
          <div className="skeleton skeleton--panel skeleton--panel-info" />
          <div className="item-detail__activity">
            <div className="skeleton skeleton--panel" />
            <div className="skeleton skeleton--panel" />
          </div>
          <section className="item-manage">
            <div className="item-manage__intro">
              <div className="skeleton skeleton--eyebrow" />
              <div className="skeleton skeleton--manage-title" />
              <div className="skeleton skeleton--lede" />
            </div>
            <div className="stack-sm">
              <div className="skeleton skeleton--panel" />
              <div className="skeleton skeleton--panel skeleton--panel-tall" />
            </div>
          </section>
        </div>
      ) : null}

      {variant === "form" ? (
        <div className="skeleton skeleton--panel" style={{ maxWidth: 520 }} />
      ) : null}
    </main>
  );
}
