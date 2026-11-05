// Nabin Babu Uranw's handwritten "NB" signature, vector-traced 1:1 from his own signature
// (potrace; edges cleaned only, no redraw). Served as tiny static SVGs from /public/brand so the
// path data stays out of the HTML and the JS bundle. Intrinsic ratio 507.8 : 400.
type Props = { tone?: "ink" | "white"; className?: string; alt?: string; reveal?: boolean; eager?: boolean };

export function Signature({ tone = "ink", className = "", alt = "Nabin Babu Uranw signature", reveal = false, eager = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/brand/nb-signature-${tone}.svg`} alt={alt} width={508} height={400} decoding="async"
      loading={eager ? "eager" : "lazy"} draggable={false}
      className={`block h-auto select-none ${reveal ? "sig-reveal" : ""} ${className}`} />
  );
}
