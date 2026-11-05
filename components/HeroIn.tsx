// CSS-only entrance (no JS needed, so the hero paints before hydration).
export function HeroIn({ children, i, className = "" }: { children: React.ReactNode; i: number; className?: string }) {
  return <div className={`rise ${className}`} style={{ animationDelay: `${60 + i * 80}ms` }}>{children}</div>;
}
