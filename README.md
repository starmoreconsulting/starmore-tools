# Starmore Tools

A growing collection of small, browser-based tools built with Astro and React.

## Principles

- Free to use, with no account required.
- Tool processing is designed to run in the browser; some tools load supporting resources from this site.
- Every tool is a React component in `src/components/tools/` registered in `src/data/tools.ts`.
- Keep the experience clean, mobile-first, and fast.
- Do not add dependencies that require API keys or payment.

## Development

```sh
npm install
npm run dev
```

## Deploy on Cloudflare Pages

The Astro site builds as static files. The `functions/` middleware keeps the Pages hostname and `www` hostname redirected to the canonical custom domain.

1. In the Cloudflare dashboard, open **Workers & Pages** and create a **Pages** application using **Connect to Git**.
2. Connect the GitHub account `starmoreconsulting` and select `starmore-tools`.
3. Use these build settings:
   - Production branch: `main`
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: `22.23.4` or newer (the project requires Node `>=22.23.4`)
4. Save and deploy. Cloudflare Pages will build future pushes to `main` automatically.
5. Add `starmoretools.com` as a custom domain in Cloudflare Pages. The `functions/_middleware.js` redirect applies to `starmore-tools.pages.dev` and `www.starmoretools.com`.

The canonical site URL is `https://starmoretools.com`. The generated sitemap and `robots.txt` use this domain.

### AdSense setup

AdSense requests are disabled unless all of these Cloudflare Pages environment variables are set for the production build:

| Variable | Value |
| --- | --- |
| `PUBLIC_ADSENSE_READY` | Set to `true` only after the site is approved, a Google-certified CMP and applicable privacy messages are configured and published in AdSense, and the privacy/disclosure pages have been reviewed. |
| `PUBLIC_ADSENSE_CLIENT_ID` | Your AdSense publisher ID, in the form `ca-pub-1234567890123456`. |
| `PUBLIC_ADSENSE_SLOT_ID` | The responsive display ad unit ID created in AdSense. |
| `PUBLIC_ADSENSE_CMP_CONFIGURED` | Set to `true` only after the AdSense Privacy & messaging CMP has been configured and published for the site. |

The current integration uses one manually placed responsive display ad on the homepage, department pages, and tool pages. It also exposes a footer control to reopen Google’s privacy choices. Keep `PUBLIC_ADSENSE_READY=false` until the account, consent messages, and ad unit are ready. Obtain and publish the exact seller record supplied by AdSense as `/ads.txt`; do not invent or copy a sample publisher record.

Google Search Console and Bing Webmaster Tools require access to their respective accounts. Verify the domain there and submit `https://starmoretools.com/sitemap.xml` after deployment.

### Cloudflare Web Analytics setup

The source integration is disabled by default. In Cloudflare Web Analytics, add the site using the manual JavaScript snippet and put its token in `PUBLIC_CF_ANALYTICS_TOKEN`; set `PUBLIC_CF_ANALYTICS_ENABLED=true` for the production build. Do not also enable Cloudflare Pages automatic injection, which would add a second beacon. Leave both variables disabled/empty for development and preview builds. Check the Cloudflare dashboard after deployment to confirm data is arriving.

## Project structure

```text
src/
  data/tools.ts                  # Central tool and department catalog
  pages/
    index.astro                  # Searchable tool directory
    [slug].astro                 # Static page generated for each tool
    logo-studio.astro            # Client-only React Logo Studio island
    departments/[dept].astro     # Static page generated for each department
    about.astro                  # About and operator information
    privacy.astro                # Privacy and advertising consent information
    disclosure.astro             # Advertising and affiliate disclosure
    contact.astro                # Contact information
  components/
    ToolLayout.astro             # Shared site frame and global styles
    Recommended.astro            # Optional affiliate recommendation card
    tools/                       # One React component per interactive tool
  engines/
    logo-studio/
      model/                      # Versioned JSON project and element types
      store/                      # Zustand project state and document history
      canvas/                     # SVG artboard and pointer geometry
      panels/                     # Editor controls, Export Centre, and My Projects
    ...                          # Other shared, UI-independent tool logic
```

PDF and image conversion tools use browser-side `pdf-lib`, `fflate`, and browser image APIs. The Markdown preview uses `marked` with DOMPurify sanitization. Logo Studio is a client-only React island at `/logo-studio`; its JSON document renders as SVG and supports local text outlining with bundled Fontsource WOFF files, SVG/PNG/JPG/vector-PDF exports, validated project JSON files, and debounced IndexedDB autosave with a My Projects screen. Fonts, editing, storage, and exports stay on the device; no external service is used. The tool registry entry remains `live: false` until it is ready to be listed.

Add a tool by implementing a React component in `src/components/tools/`, then add its `slug`, `name`, `department`, card description, unique `seoTitle` and `seoDescription`, three `howTo` steps, 2–3 `faqs`, component export name, and `live` status to `src/data/tools.ts`. A tool may also include an optional `recommended` card with a title, description, URL, and button text. Only entries in `liveTools` appear in the directory, department listings, generated pages, and automatically generated `/sitemap.xml`. Keep unfinished tools at `live: false`. Add the corresponding static import and component branch in `src/pages/[slug].astro` before setting a tool to live; Astro needs explicit component imports for client hydration. Add new departments to the `departments` list in `src/data/tools.ts`.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build |
