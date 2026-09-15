const exports = [
  ["Transactions", "Daily records with source and destination accounts", "transactions-csv"],
  ["Accounts", "Balances and active/archive state", "accounts-csv"],
  ["Assets", "Values, categories, and net-worth inclusion", "assets-csv"],
  ["Debts", "Payables, receivables, payments, and status", "debts-csv"],
  ["Crypto", "Holdings and capital-flow history", "crypto-csv"],
];

export default function Backup() {
  return <><div className="pageHead"><div><p className="eyebrow">Safety</p><h1>Backup & export</h1><p>Download a timestamped portable copy of your records anytime.</p></div></div>
    <section className="panel narrow"><h2>Full JSON backup</h2><p className="muted">Includes transactions, accounts, assets, debts, crypto holdings, flows, and settings. Store it somewhere private.</p><a className="btn primary exportButton" href="/api/export?format=json">Download full backup</a></section>
    <section className="panel narrow"><div className="panelHead"><div><h2>Spreadsheet exports</h2><p>UTF-8 CSV files that open cleanly in Excel and Google Sheets.</p></div></div><div className="exportList">{exports.map(([label, description, format]) => <div className="exportRow" key={format}><div><b>{label}</b><small>{description}</small></div><a className="btn" href={`/api/export?format=${format}`}>Download CSV</a></div>)}</div></section>
  </>;
}
