import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="panel form-shell">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Missing resource</p>
            <h1 className="panel-title">The requested subscription plan could not be found.</h1>
            <p className="panel-subtitle">
              The plan may have been deleted, or the URL may be pointing at an old record.
            </p>
          </div>
        </div>

        <div className="button-row">
          <Link href="/plans" className="button-primary">
            Return to datatable
          </Link>
        </div>
      </section>
    </main>
  );
}
