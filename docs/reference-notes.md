# Doory frontend notes

Scope: the public `frontend/` source in [shaongitbd/doory](https://github.com/shaongitbd/doory). Backend implementation details are excluded. The notes describe the current source, not a local performance benchmark.

## 1. In-browser background removal

The frontend runs a segmentation model through `onnxruntime-web` in a Web Worker. It decodes the image locally, runs inference on a reduced guide image, refines the mask against that guide, then applies the resulting alpha matte to the original-resolution image. The UI also supports server-side removal, so a browser-only rebuild should expose only the device option.

The worker/runtime chunk is dynamically imported on the first removal. The model itself is not bundled in the frontend: the app receives a same-origin URL, name, byte count and SHA-256 from its runtime configuration, downloads it on demand, verifies it, and caches it in Cache Storage for later use. The frontend permits descriptors up to 512 MiB, but that is a validation ceiling—not the actual model size. The frontend does not identify a fixed model, give its actual size, or state its licence; those facts cannot be established from frontend sources alone.

`onnxruntime-web`/ONNX Runtime is MIT-licensed; retain its copyright and licence notice when redistributing it. The model is a separate asset, and its exact licence and redistribution terms must be checked for the particular model file before bundling it. A rebuild is **practical**, but background removal is a raster-image feature rather than an SVG operation. It needs a licensed model, a local model URL or bundled asset, browser inference runtime/WASM, worker processing, and enough memory for full-resolution pixels. Lazy loading and local caching avoid paying the model-download cost on initial page load.

Sources: [loader](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/bgRemoval/install.ts), [model descriptor](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/bgRemoval/model.ts), [model cache and verification](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/bgRemoval/modelStore.ts), [inference pipeline](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/bgRemoval/pipeline.ts), [background-removal choices](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/hooks/useBackgroundRemovalOptions.ts), [ONNX Runtime licence](https://github.com/microsoft/onnxruntime/blob/main/LICENSE).

## 2. Image upscaler

This is not an AI model: it is a handwritten resampler with no third-party image-processing dependency or network request. Photo mode uses separable Lanczos-3 filtering, linear-light and premultiplied-alpha arithmetic, an anti-ringing clamp and optional luminance sharpening. Pixel-art mode uses nearest-neighbour scaling. Decoding, resampling and encoding run in a dedicated worker using browser image/canvas APIs, so long work does not monopolize the editor’s main thread.

The implementation has output limits (up to 48 million pixels and a 12,000-pixel side in its general limits; a lower 16,777,216-pixel ceiling is used on iOS/iPadOS and devices reporting 4 GB RAM or less). Its comments estimate working buffers in the low hundreds of megabytes for large jobs. There are **no measured wall-clock timings in the inspected source**, so a specific claim such as “seconds for a large image” would be unsupported. Responsiveness is protected by the worker, but elapsed time and whether a job fits depend on the device and requested output size.

Rebuilding this is **practical** for raster assets in a browser-only app, including one whose main artwork is SVG. For a logo studio it is most useful for imported raster references or raster exports; vector artwork itself should remain vector. The algorithm adds no separate library licence, but copying its implementation would be subject to Doory’s repository licence (see licence note below).

Sources: [upscale algorithm](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/upscale/core.ts), [worker](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/upscale/worker.ts), [worker client](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/upscale/client.ts), [image decoding and encoding](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/upscale/image.ts), [limits](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/upscale/types.ts).

## 3. Print PDFs, bleed and crop marks

The frontend offers a screen preset (no bleed or marks), a standard preset (3 mm bleed and crop marks), and custom settings with bleed from 0 to 10 mm. Geometry is calculated from the trim size: bleed expands the artwork on every side, and crop marks occupy a separate margin beyond it. The marks are eight short vector hairlines at the trim corners, with a 1 mm gap and 5 mm mark length.

There are two PDF paths. The browser PDF uses jsPDF and embeds each page rendered as a 300-DPI JPEG (including the bleed); crop marks are drawn as vector lines. Thus this path is not a fully vector PDF for the page artwork. A separate print-quality option sends bleed-expanded SVG pages and settings to a server adapter for PDF production, so that path is **not backend-free** as implemented.

Rebuilding the layout is **practical**: the trim/bleed/slug geometry and crop marks are straightforward to generate locally. A vector PDF is also achievable for an SVG-based studio, but requires a reliable SVG-to-PDF path and font handling (for logos, converting text to paths is a robust option). Doory’s frontend does not establish a model-specific licence issue here; any PDF library selected for a rebuild has its own licence to check.

Sources: [print geometry](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/export/printGeometry.ts), [print presets and limits](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/dialogs/print/printOptions.ts), [browser and server PDF paths](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/export/formats.ts).

## 4. Resize to another format

Resize operates on serialized page objects, not a flattened screenshot. The user can choose:

- **Magic:** remaps each object’s centre for the new aspect ratio, scales it uniformly to fit and clamps it within the new page. Large objects judged to cover the page are instead scaled to cover and centred; this is intended to keep backgrounds full bleed.
- **Scale:** scales all content uniformly to fit and centres it, leaving letterboxing when the aspect ratios differ.
- **Keep:** changes the page dimensions but leaves objects in place.

The mapping accounts for rotation when finding object bounds, scales text font size in the supported untransformed-text case, maps image slots and backgrounds, and updates or removes guides. The dialog previews the result using the same resize mapping.

This is **practical to rebuild** in an SVG JSON model: map element bounds and centres, preserve rotation, and keep resize modes explicit. For logo work, semantic rules (e.g. anchor the mark, reflow or shrink text, preserve icon/name relationships) would improve on generic object-by-object scaling. The basic behavior can run entirely in the browser. Doory code is under its own attribution-required licence, so independently implementing the behavior is safer than copying its implementation.

Sources: [resize mapping](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/engine/magicResize.ts), [resize dialog](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/dialogs/ResizeDialog.tsx), [resize preview](https://github.com/shaongitbd/doory/blob/main/frontend/src/editor/dialogs/ResizePreview.tsx).

## 5. Brand kits

The frontend’s brand-kit model contains an ID and name, a default-kit flag, a list of named HEX colors, role-based font families (heading, subheading and body), and selected logo asset records. The editor can add up to 20 colors, choose fonts from the available/uploaded font lists, and select logos from the user’s assets.

The current frontend is **not backend-independent**: brand kits, asset lists, uploaded fonts and logo asset references are wired to API hooks. Rebuilding the concept locally is **practical**: store the kit data and logo/font blobs in IndexedDB, then expose actions that apply its palette, typography and logos to a project. No paid service is inherently required; a browser-only implementation would need local persistence and local assets instead of Doory’s API-backed lists and records.

Sources: [brand-kit types](https://github.com/shaongitbd/doory/blob/main/frontend/src/types/api.ts), [brand-kit editor](https://github.com/shaongitbd/doory/blob/main/frontend/src/features/brand/BrandKitEditor.tsx).

## Licence and reuse caveat

Doory’s repository uses the **Attribution Assurance License**, not a standard permissive MIT licence. Its redistribution conditions require the signed licence text to accompany source redistributions and prominent author attribution when a binary is launched, and prohibit using the author’s name or trademark to endorse derivatives without permission. The request here is to study and independently rebuild ideas, not copy code; this report therefore contains descriptions only. Check the current licence and all asset/library/model licences before reusing or distributing any implementation or model.

Source: [Doory licence](https://github.com/shaongitbd/doory/blob/main/LICENSE).

## OpenDesign

Scope: OpenDesign’s public source at [clawnify/OpenDesign](https://github.com/clawnify/OpenDesign). The notes distinguish its browser editor from API-backed persistence and uploads.

### 1. Template fields

The editor gives selected text or image objects an optional `fieldName` property. A non-empty name makes that object a fill slot; the name is intentionally reusable, including across grouped objects and multiple pages. The fields endpoint walks every page’s serialized canvas JSON (including nested groups), reports one record per unique name, infers the type from each actual object (`text` or `image`), and provides a default value plus the page IDs containing that name.

Filling creates substituted page JSON without changing the saved source design. For each matching named text object it replaces `text`; for each image it replaces `src`, leaving the object's original box and other properties in place. Therefore replacement images with different aspect ratios may stretch. It returns names filled and supplied names with no matching object. One supplied name can fill repeated objects across several pages—for example, one logo across all carousel slides. Only text and image objects are fillable.

This is **practical to rebuild** in an SVG document model: put an optional, stable `fieldName` on text and image elements, collect unique names by walking pages and groups, and apply values to a cloned project. Text becomes the text node’s value; an image slot updates its local image reference while keeping the frame geometry. For images, choose and document a fit rule (contain/cover) rather than silently stretching. All of this can run in-browser; a server is only needed if templates, fills, or resulting projects must be shared or centrally stored.

Sources: [field collection and substitution](https://github.com/clawnify/OpenDesign/blob/main/src/server/fields.ts), [field-name editor](https://github.com/clawnify/OpenDesign/blob/main/src/client/components/right-sidebar.tsx), [field API and design persistence](https://github.com/clawnify/OpenDesign/blob/main/src/server/index.ts), [template-fields documentation](https://github.com/clawnify/OpenDesign#template-fields).

### 2. Brand-kit JSON

The persisted kit has `id`, `name`, `colors`, `heading_font`, `body_font`, `logos`, `created_at`, and `updated_at`. `colors` is an array of HEX strings; the two font properties are family names; `logos` is an array of asset URLs. In SQLite, the color and logo arrays are stored as JSON text, with font defaults (`Montserrat` and `Inter`). Its portable JSON export uses an `opendesign_brand_kit: 1` marker and contains name, colors, heading/body font names, and logos. During export, logo assets are inlined as data URIs so they remain portable; referenced custom fonts are included with family, filename and data URI. Import validates basic structure, limits color/logo counts, then stores embedded files in the receiving installation and replaces portable data URIs with local asset URLs.

This is **practical to rebuild** directly: define a versioned JSON type in the app, store the kit and referenced SVG/image/font blobs in IndexedDB, and export a self-contained JSON package or a JSON manifest plus a ZIP of assets. For an SVG studio, logos can remain SVG and font blobs can be included as optional embedded assets. Validate file sizes, types and data URIs on import. The existing pattern depends on its API/R2 bucket for durable asset URLs; local IndexedDB removes that dependency.

Sources: [brand-kit types](https://github.com/clawnify/OpenDesign/blob/main/src/client/types.ts), [database schema](https://github.com/clawnify/OpenDesign/blob/main/schema.sql), [JSON serialization and validation](https://github.com/clawnify/OpenDesign/blob/main/src/client/lib/brand.ts), [portable asset/font transfer](https://github.com/clawnify/OpenDesign/blob/main/src/client/lib/kit-transfer.ts).

### 3. Carousel PDF export

The export path renders each Fabric canvas as a PNG at 2× the design dimensions, then dynamically imports jsPDF and creates one PDF page per canvas. Every page uses the same width, height and orientation, and each PNG is added to fill its page. The PDF keeps the design’s aspect ratio and is downloaded as one file. This is a **raster PDF**, not vector artwork; the PNG conversion also means text and shapes are no longer independently editable in the PDF.

This is **practical to rebuild** for an SVG-based editor: render each page’s standalone SVG to a PNG at the desired resolution and add it to a jsPDF page. For sharper, scalable output, add the SVG as vector content through a suitable SVG-to-PDF library instead of rasterizing. The current carousel path runs in the browser; it does not need a PDF server. jsPDF is MIT-licensed, but retain its notice when redistributing it and check the licences of any alternative SVG/PDF dependency.

Sources: [PNG and carousel PDF export](https://github.com/clawnify/OpenDesign/blob/main/src/client/lib/export.ts), [jsPDF dependency](https://github.com/clawnify/OpenDesign/blob/main/package.json).

### 4. Custom font import

The font picker accepts `.ttf`, `.otf`, `.woff`, and `.woff2` files up to 10 MB. The browser first attempts to decode the selected bytes with `FontFace`, then posts the file to the server. The server checks the extension, size, and file signature, stores it in the app’s R2 upload bucket, and returns a generated family ID, original display name, and same-app URL. The browser registers the loaded font with `document.fonts`; the library fetches stored fonts on startup. The source also imports all bundled font CSS and explicitly asks the browser to load every bundled family/weight, so those fonts are loaded upfront rather than on first use.

This is **practical to rebuild** locally: validate and load a user-selected file with `FontFace`, retain the Blob in IndexedDB, and store the family metadata with the project. Object URLs can be used during a session; recreate them from the saved Blob after reload. For font outlining/export, retain a supported local font format or convert using an appropriate local library. A shared cross-device font library is a separate synchronization problem and would require a server or user-managed export/import.

The uploaded font is not automatically licensed for redistribution or embedding: users need rights to use it in the app and include it in projects or exported kits. Check the licence terms for each bundled font and any font parsing/embedding library. OpenDesign’s own repository is MIT-licensed; that does not change font licences.

Sources: [font loading and upload flow](https://github.com/clawnify/OpenDesign/blob/main/src/client/fonts.ts), [font picker](https://github.com/clawnify/OpenDesign/blob/main/src/client/components/font-picker.tsx), [server font storage](https://github.com/clawnify/OpenDesign/blob/main/src/server/uploads.ts), [font packages](https://github.com/clawnify/OpenDesign/blob/main/package.json).

### 5. Server needs and browser-only minimum

OpenDesign’s current app uses a Hono API, SQLite/D1 for designs, pages, templates and kits, and an R2-compatible bucket for uploaded images and fonts. Its template fill operation is pure JSON processing and its carousel PDF rendering happens in the browser, but the integrated app still calls API routes for saved designs, template retrieval, brand kits, uploads and fonts. A server is therefore needed for the current multi-user/shared persistence and asset URL model, not for the basic editing, template filling, or PDF-generation algorithms.

A minimum **browser-only** version could be a static app that bundles read-only template JSON and uses IndexedDB for projects, pages, kits and uploaded asset Blobs. It can clone and fill a project locally, load fonts with `FontFace`, render/export locally, and offer file-based JSON/ZIP import and export. No database server, upload API, or third-party service is required. Add a server only if users need accounts, collaboration, cross-device sync, centrally managed templates, or shared asset hosting.

### OpenDesign licence

OpenDesign’s repository declares the **MIT License** (copyright Clawnify): include its copyright and permission notice in redistributed copies or substantial portions. Third-party dependencies and font files have their own licences; check those independently. This report describes behavior and does not copy OpenDesign code.

Source: [OpenDesign licence](https://github.com/clawnify/OpenDesign/blob/main/LICENSE).
