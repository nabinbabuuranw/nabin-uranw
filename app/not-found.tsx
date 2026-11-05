import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell flex min-h-[80vh] flex-col items-start justify-center gap-6 py-24">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-5xl font-semibold tracking-tightest">This page doesn’t exist.</h1>
      <Link href="/" className="btn-primary">Back to the portfolio</Link>
    </main>
  );
}
