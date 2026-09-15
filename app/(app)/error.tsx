"use client";

import { useEffect } from "react";

export default function FinanceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <section className="panel narrow errorPanel"><p className="eyebrow">Something went wrong</p><h1>Finance records could not be loaded</h1><p>The database may be temporarily unavailable. No data was changed by this error.</p><button className="btn primary" type="button" onClick={reset}>Try again</button></section>;
}
