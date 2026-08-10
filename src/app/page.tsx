import Link from "next/link";
import { inventoryCounts } from "@/lib/data";
import { isStudent, requireApprovedPage } from "@/lib/auth";

export default async function HomePage() {
  const user = await requireApprovedPage();
  const counts = await inventoryCounts();
  const student = isStudent(user);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">VIS Science</p>
        <h1>Lab inventory at a glance</h1>
        <p className="lede">
          {student
            ? "Browse equipment and consumables for lab club. Ask a teacher if you need something signed out."
            : "Browse equipment and consumables, sign items out by SKU, and spot what needs restocking before the next lesson."}
        </p>
      </section>

      <div className="stats-row">
        <Link href="/equipment" className="stat">
          <p className="stat__label">Equipment</p>
          <p className="stat__value">{counts.equipment}</p>
        </Link>
        <Link href="/consumables" className="stat">
          <p className="stat__label">Consumables</p>
          <p className="stat__value">{counts.consumables}</p>
        </Link>
        {!student ? (
          <>
            <Link
              href="/restock"
              className={`stat ${counts.restock ? "stat--alert" : ""}`}
            >
              <p className="stat__label">Need restock</p>
              <p className="stat__value">{counts.restock}</p>
            </Link>
            <Link href="/sign-out" className="stat">
              <p className="stat__label">Open sign-outs</p>
              <p className="stat__value">{counts.openSignOuts}</p>
            </Link>
          </>
        ) : null}
      </div>

      <div className="home-grid">
        <Link href="/equipment" className="home-card">
          <p className="eyebrow">Catalog</p>
          <h2>Equipment</h2>
          <p>Glassware, tools, and reusable lab gear with current stock levels.</p>
        </Link>
        <Link href="/consumables" className="home-card">
          <p className="eyebrow">Catalog</p>
          <h2>Consumables</h2>
          <p>Chemicals and supplies with per-item units and SDS details.</p>
        </Link>
        {!student ? (
          <>
            <Link href="/sign-out" className="home-card">
              <p className="eyebrow">Workflow</p>
              <h2>Sign out</h2>
              <p>Find an item by SKU, take what you need, and record returns.</p>
            </Link>
            <Link href="/restock" className="home-card">
              <p className="eyebrow">Alerts</p>
              <h2>Restock</h2>
              <p>Everything currently below its restock threshold, highlighted in red.</p>
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}
