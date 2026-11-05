# nabin-uranw

Source of the portfolio of Nabin Babu Uranw, an independent full-stack developer in Inaruwa, Sunsari, Nepal.

- Live: https://nabinbabuuranw.com.np
- GitHub Pages mirror: https://nabinbabuuranw.github.io/nabin-uranw/
- Stack: Next.js 15 (static export), React 19, TypeScript, Tailwind CSS, Framer Motion.

## Build

    npm ci
    npx next build        # static site in out/

For GitHub Pages the workflow sets `PAGES_BASE_PATH=/nabin-uranw` and runs `scripts/pages-rewrite.mjs`.

## Notes

- The large film files (`public/__f/*.mp4|webm`, 5 to 8 MB each) are not in this repository. The Pages build loads them from the main site (`NEXT_PUBLIC_MEDIA_BASE`).
- `worker/` is the Cloudflare Worker (request form, contact relay, admin API). It needs its own secrets at build time (see `REQUESTS.md`) and is not part of the static Pages build. Never commit secrets.
