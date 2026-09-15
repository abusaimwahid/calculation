"use client";

export function ConfirmButton({ children = "Delete", message, className = "miniBtn danger" }: { children?: React.ReactNode; message: string; className?: string }) {
  return <button className={className} type="submit" onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
