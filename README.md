# Starmore Tools

A growing collection of small, browser-based tools built with Astro and React.

## Principles

- Free to use, with no account required.
- All tool processing runs in the browser; no paid services or processing servers.
- Every tool is a React component in `src/components/tools/` registered in `src/data/tools.ts`.
- Keep the experience clean, mobile-first, and fast.
- Do not add dependencies that require API keys or payment.

## Development

```sh
npm install
npm run dev
```

## Project structure

```text
src/
  data/tools.ts                  # Central tool and department catalog
  pages/
    index.astro                  # Searchable tool directory
    [slug].astro                 # Static page generated for each tool
    departments/[dept].astro     # Static page generated for each department
  components/
    ToolLayout.astro             # Shared site frame and global styles
    tools/                       # One React component per interactive tool
  engines/                       # Shared, UI-independent tool logic
```

Add a tool by implementing a React component in `src/components/tools/`, then add its `slug`, `name`, `department`, `description`, component export name, and `live` status to `src/data/tools.ts`. Only entries in `liveTools` appear in the directory, department listings, and generated pages. Keep unfinished tools at `live: false`. Add the corresponding static import and component branch in `src/pages/[slug].astro` before setting a tool to live; Astro needs explicit component imports for client hydration. Add new departments to the `departments` list in `src/data/tools.ts`.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the production build |
