# Cadre AI branding

Back to the [README](../README.md).

The office uses the assets and rules from the supplied [Cadre AI brand page](https://sdx-cadre-brand-assets.vercel.app/cadre) and its [February 2026 guidelines](https://sdx-cadre-brand-assets.vercel.app/assets/cadre/cadre-guidelines.md), retrieved October 27, 2026.

## Local assets

`src/client/public/brand/` contains the original black/sand wordmark SVGs and black/white cube SVGs. Their shapes and colors are unchanged. The cube originals retain their original SVG view boxes.

The supplied wordmark SVGs contain live Poppins text, rather than paths. Their PNG counterparts are transparent, 856 × 256 rasterizations of those exact SVGs, rendered after loading the supplied Poppins SemiBold font. Use the PNGs for image elements and three.js textures so the wordmark cannot fall back to another font. Preserve their 214:64 aspect ratio; do not stretch or recolor them.

The page's Inter variable, Inter Tight Bold, and Poppins SemiBold Latin font files are served locally. Their accompanying SIL Open Font License notices are included. `sources.json` records the exact download URLs and file checksums. Visitors do not need a connection to the brand site or a font CDN.

## Design rules

| Use | Value |
| --- | --- |
| Primary text and buttons | `#000000` |
| Dark sections | `#242424` |
| Warm white background | `#FAF9F6` |
| Sand surfaces and wordmark on dark | `#F4F0E6` |
| Red emphasis | `#DB4545` |
| Supporting links and focus rings | `#08749B` |
| Body text | `#2B2B2B` |
| Borders | `#E5E2D8` |

Use Inter for body text and controls, Inter Tight 700 for headings, and Poppins 600 only for the Cadre AI name. Use the black wordmark on light surfaces and the sand version on dark surfaces. Keep the logo clear of surrounding content. The sign-in uses the brand's rounded cards, 54px inputs, and black pill-shaped primary action.
