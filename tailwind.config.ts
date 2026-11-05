import type { Config } from "tailwindcss";
// Palette: Coolors "Forest Green" — https://coolors.co/palette/1f2421-216869-49a078-9cc5a1-dce1de
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F2421",      // text, dark band
        teal: { DEFAULT: "#216869", deep: "#1A5354" }, // primary / links / buttons
        fern: "#49A078",     // live / status (non-text on light; text on dark)
        sage: "#9CC5A1",     // accent on dark, highlight
        mist: "#DCE1DE",     // hairlines, subtle surfaces
        paper: "#F2F4F2",    // page background (derived from mist)
        muted: "#5A6560",    // secondary text (5.5:1 on paper)
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { shell: "1240px" },
      letterSpacing: { tightest: "-0.045em" },
    },
  },
  plugins: [],
} satisfies Config;
