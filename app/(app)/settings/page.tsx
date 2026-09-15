export default function Settings() {
  const production = process.env.NODE_ENV === "production";
  const configured = Boolean(process.env.APP_USER && process.env.APP_PASSWORD && process.env.SESSION_SECRET && process.env.DATABASE_URL);
  return <>
    <div className="pageHead"><div><p className="eyebrow">Configuration</p><h1>Settings</h1><p>LifeLedger stays intentionally small: account access and infrastructure are configured through private environment variables.</p></div></div>
    <section className="panel narrow"><div className="panelHead"><div><h2>Security status</h2><p>No credential values are shown here.</p></div><span className={`pill ${production && configured ? "income" : "neutral"}`}>{production ? configured ? "Configured" : "Missing variables" : "Development mode"}</span></div>
      <div className="summaryRows"><div><span>Private single-user login</span><b>Enabled</b></div><div><span>Session</span><b>Signed · HTTP-only · 30 days</b></div><div><span>Production cookie</span><b>Secure</b></div><div><span>Database</span><b>PostgreSQL via Prisma</b></div></div>
    </section>
    <section className="panel narrow"><h2>Net-worth formula</h2><p className="muted">Active account balances + included assets + receivables + available USDT and crypto holdings − payables. Transfers never count as income or expense.</p></section>
  </>;
}
