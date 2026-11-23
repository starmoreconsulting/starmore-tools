export interface ParsedColor {
	red: number;
	green: number;
	blue: number;
	alpha: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function parseAlpha(value: string): number {
	const alpha = value.endsWith('%') ? Number(value.slice(0, -1)) / 100 : Number(value);
	if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new Error('Alpha must be between 0 and 1, or 0% and 100%.');
	return alpha;
}

function parseRgbChannel(value: string): number {
	const channel = value.endsWith('%') ? Number(value.slice(0, -1)) * 255 / 100 : Number(value);
	if (!Number.isFinite(channel) || channel < 0 || channel > 255) throw new Error('RGB channels must be between 0 and 255, or 0% and 100%.');
	return clamp(Math.round(channel), 0, 255);
}

function parseFunctionalParts(value: string): { name: string; channels: string[]; alpha?: string } {
	const match = value.trim().match(/^(rgba?|hsla?)\(\s*(.*?)\s*\)$/i);
	if (!match) throw new Error('Enter a CSS hex, rgb(), rgba(), hsl(), or hsla() colour.');
	const body = match[2];
	if (body.includes(',')) {
		if (body.includes('/')) throw new Error('Use either comma-separated channels or modern space/slash syntax.');
		const parts = body.split(',').map((part) => part.trim());
		if (parts.length !== 3 && parts.length !== 4) throw new Error('A colour needs three channels and an optional alpha value.');
		return { name: match[1].toLowerCase(), channels: parts.slice(0, 3), alpha: parts[3] };
	}
	const slashParts = body.split('/');
	if (slashParts.length > 2) throw new Error('A colour can contain only one alpha separator.');
	const channels = slashParts[0].trim().split(/\s+/);
	if (channels.length !== 3 || channels.some((part) => !part)) throw new Error('A colour needs exactly three channels.');
	const alpha = slashParts[1]?.trim();
	if (slashParts.length === 2 && !alpha) throw new Error('Enter an alpha value after the slash.');
	return { name: match[1].toLowerCase(), channels, alpha };
}

function parseHue(value: string): number {
	const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)?$/i);
	if (!match) throw new Error('HSL hue must be a number with optional deg, grad, rad, or turn units.');
	const amount = Number(match[1]);
	const unit = (match[2] || 'deg').toLowerCase();
	const degrees = unit === 'turn' ? amount * 360 : unit === 'rad' ? amount * (180 / Math.PI) : unit === 'grad' ? amount * 0.9 : amount;
	return ((degrees % 360) + 360) % 360;
}

function parsePercentage(value: string, label: string): number {
	if (!value.trim().endsWith('%')) throw new Error(`${label} must be a percentage.`);
	const amount = Number(value.trim().slice(0, -1));
	if (!Number.isFinite(amount) || amount < 0 || amount > 100) throw new Error(`${label} must be between 0% and 100%.`);
	return amount / 100;
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const segment = hue / 60;
	const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
	const match = lightness - chroma / 2;
	const rgb = segment < 1 ? [chroma, secondary, 0] : segment < 2 ? [secondary, chroma, 0]
		: segment < 3 ? [0, chroma, secondary] : segment < 4 ? [0, secondary, chroma]
			: segment < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
	return rgb.map((channel) => Math.round((channel + match) * 255)) as [number, number, number];
}

function rgbToHsl({ red, green, blue }: ParsedColor): [number, number, number] {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const maximum = Math.max(r, g, b);
	const minimum = Math.min(r, g, b);
	const delta = maximum - minimum;
	let hue = 0;
	if (delta) {
		if (maximum === r) hue = 60 * (((g - b) / delta) % 6);
		else if (maximum === g) hue = 60 * ((b - r) / delta + 2);
		else hue = 60 * ((r - g) / delta + 4);
	}
	if (hue < 0) hue += 360;
	const lightness = (maximum + minimum) / 2;
	const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
	return [Math.round(hue), Math.round(saturation * 100), Math.round(lightness * 100)];
}

export function parseCssColor(input: string): ParsedColor {
	const value = input.trim();
	const hexMatch = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (hexMatch) {
		let digits = hexMatch[1];
		if (digits.length === 3 || digits.length === 4) digits = [...digits].map((digit) => digit + digit).join('');
		return {
			red: parseInt(digits.slice(0, 2), 16),
			green: parseInt(digits.slice(2, 4), 16),
			blue: parseInt(digits.slice(4, 6), 16),
			alpha: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
		};
	}
	const { name, channels, alpha } = parseFunctionalParts(value);
	const isHsl = name.startsWith('hsl');
	if (name.endsWith('a') && alpha === undefined) throw new Error(`${name}() requires an alpha value.`);
	const parsedAlpha = alpha === undefined ? 1 : parseAlpha(alpha);
	if (isHsl) {
		const rgb = hslToRgb(parseHue(channels[0]), parsePercentage(channels[1], 'Saturation'), parsePercentage(channels[2], 'Lightness'));
		return { red: rgb[0], green: rgb[1], blue: rgb[2], alpha: parsedAlpha };
	}
	return {
		red: parseRgbChannel(channels[0]),
		green: parseRgbChannel(channels[1]),
		blue: parseRgbChannel(channels[2]),
		alpha: parsedAlpha,
	};
}

function alphaText(alpha: number): string {
	return String(Number(alpha.toFixed(3)));
}

export function convertCssColor(input: string): Record<string, string> {
	const color = parseCssColor(input);
	const hex = `#${[color.red, color.green, color.blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
	const hex8 = `${hex}${Math.round(color.alpha * 255).toString(16).padStart(2, '0')}`;
	const hsl = rgbToHsl(color);
	const rgbText = `${color.red}, ${color.green}, ${color.blue}`;
	const alpha = alphaText(color.alpha);
	return {
		HEX: color.alpha === 1 ? hex : hex8,
		RGB: color.alpha === 1 ? `rgb(${rgbText})` : `rgba(${rgbText}, ${alpha})`,
		HSL: color.alpha === 1 ? `hsl(${hsl[0]} ${hsl[1]}% ${hsl[2]}%)` : `hsl(${hsl[0]} ${hsl[1]}% ${hsl[2]}% / ${alpha})`,
	};
}

export interface BorderRadiusOptions {
	topLeft: number;
	topRight: number;
	bottomRight: number;
	bottomLeft: number;
	unit: 'px' | '%';
}

export function buildBorderRadiusCss(options: BorderRadiusOptions): string {
	if (!['px', '%'].includes(options.unit)) throw new Error('Choose px or % for the border-radius unit.');
	const values = [options.topLeft, options.topRight, options.bottomRight, options.bottomLeft];
	if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 500)) throw new Error('Corner radii must be between 0 and 500.');
	return `border-radius: ${values.map((value) => `${value}${options.unit}`).join(' ')};`;
}

export interface ButtonOptions {
	label: string;
	background: string;
	text: string;
	hoverBackground: string;
	border: string;
	radius: number;
	paddingVertical: number;
	paddingHorizontal: number;
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validHexColor(value: string): boolean {
	return /^#[\da-f]{6}$/i.test(value);
}

export function buildButtonCode(options: ButtonOptions): { css: string; html: string } {
	if ([options.background, options.text, options.hoverBackground, options.border].some((value) => !validHexColor(value))) throw new Error('Choose valid 6-digit hex colours for the button.');
	if (![options.radius, options.paddingVertical, options.paddingHorizontal].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error('Button dimensions must be between 0 and 100 pixels.');
	const css = `.button {\n  display: inline-block;\n  padding: ${options.paddingVertical}px ${options.paddingHorizontal}px;\n  border: 1px solid ${options.border};\n  border-radius: ${options.radius}px;\n  background: ${options.background};\n  color: ${options.text};\n  font: inherit;\n  cursor: pointer;\n}\n.button:hover {\n  background: ${options.hoverBackground};\n}`;
	return { css, html: `<button class="button" type="button">${escapeHtml(options.label)}</button>` };
}

export interface MetaTagOptions {
	title: string;
	description: string;
	keywords?: string;
	author?: string;
	canonicalUrl?: string;
	robots?: string;
}

export function buildMetaTags(options: MetaTagOptions): string {
	const lines: string[] = [];
	if (options.title.trim()) lines.push(`<title>${escapeHtml(options.title.trim())}</title>`);
	if (options.description.trim()) lines.push(`<meta name="description" content="${escapeHtml(options.description.trim())}">`);
	if (options.keywords?.trim()) lines.push(`<meta name="keywords" content="${escapeHtml(options.keywords.trim())}">`);
	if (options.author?.trim()) lines.push(`<meta name="author" content="${escapeHtml(options.author.trim())}">`);
	if (options.canonicalUrl?.trim()) {
		if (!isHttpUrl(options.canonicalUrl.trim())) throw new Error('Canonical URL must be an absolute http:// or https:// URL.');
		lines.push(`<link rel="canonical" href="${escapeHtml(options.canonicalUrl.trim())}">`);
	}
	if (options.robots?.trim()) {
		if (!/^[a-z0-9,\s_-]+$/i.test(options.robots.trim())) throw new Error('Robots directives may contain letters, numbers, commas, spaces, underscores, and hyphens only.');
		lines.push(`<meta name="robots" content="${escapeHtml(options.robots.trim())}">`);
	}
	if (!lines.length) throw new Error('Enter at least one value to generate a meta tag.');
	return lines.join('\n');
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

export interface RobotsOptions {
	userAgent: string;
	disallow: string;
	allow: string;
	sitemapUrl: string;
	crawlDelay?: number | null;
}

function robotPaths(value: string, directive: string): string[] {
	const paths = value.split(/\r?\n/).map((path) => path.trim()).filter(Boolean);
	if (paths.some((path) => !path.startsWith('/') || /[\r\n#]/.test(path))) throw new Error(`${directive} paths must start with / and cannot contain comments or line breaks.`);
	return paths;
}

export function buildRobotsTxt(options: RobotsOptions): string {
	const agent = options.userAgent.trim() || '*';
	if (!/^[a-z0-9*._-]+$/i.test(agent)) throw new Error('User-agent may contain letters, numbers, *, dots, underscores, and hyphens only.');
	const lines = [`User-agent: ${agent}`];
	for (const path of robotPaths(options.disallow, 'Disallow')) lines.push(`Disallow: ${path}`);
	for (const path of robotPaths(options.allow, 'Allow')) lines.push(`Allow: ${path}`);
	if (options.crawlDelay !== null && options.crawlDelay !== undefined) {
		if (!Number.isInteger(options.crawlDelay) || options.crawlDelay < 0 || options.crawlDelay > 86400) throw new Error('Crawl delay must be a whole number between 0 and 86400 seconds.');
		lines.push(`Crawl-delay: ${options.crawlDelay}`);
	}
	if (options.sitemapUrl.trim()) {
		if (!isHttpUrl(options.sitemapUrl.trim())) throw new Error('Sitemap URL must be an absolute http:// or https:// URL.');
		lines.push(`Sitemap: ${options.sitemapUrl.trim()}`);
	}
	return `${lines.join('\n')}\n`;
}

export interface SitemapEntry {
	url: string;
	lastModified?: string;
	changeFrequency?: string;
	priority?: string;
}

const changeFrequencies = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

function xmlEscape(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
	const usableEntries = entries.filter((entry) => entry.url.trim());
	if (!usableEntries.length) throw new Error('Add at least one page URL to generate a sitemap.');
	const items = usableEntries.map((entry) => {
		const url = entry.url.trim();
		if (!isHttpUrl(url)) throw new Error(`Sitemap URL "${url}" must be absolute and use http or https.`);
		const parts = [`    <loc>${xmlEscape(url)}</loc>`];
		if (entry.lastModified?.trim()) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastModified.trim()) || Number.isNaN(Date.parse(`${entry.lastModified.trim()}T00:00:00Z`)) || new Date(`${entry.lastModified.trim()}T00:00:00Z`).toISOString().slice(0, 10) !== entry.lastModified.trim()) throw new Error('Last modified dates must be valid YYYY-MM-DD dates.');
			parts.push(`    <lastmod>${entry.lastModified.trim()}</lastmod>`);
		}
		if (entry.changeFrequency?.trim()) {
			const frequency = entry.changeFrequency.trim().toLowerCase();
			if (!changeFrequencies.has(frequency)) throw new Error('Choose a supported sitemap change frequency.');
			parts.push(`    <changefreq>${frequency}</changefreq>`);
		}
		if (entry.priority?.trim()) {
			const priority = Number(entry.priority.trim());
			if (!Number.isFinite(priority) || priority < 0 || priority > 1) throw new Error('Sitemap priority must be between 0.0 and 1.0.');
			parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
		}
		return `  <url>\n${parts.join('\n')}\n  </url>`;
	});
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>`;
}

export interface OpenGraphOptions {
	title: string;
	description: string;
	imageUrl: string;
	pageUrl: string;
	siteName?: string;
	type?: string;
}

export function buildOpenGraphTags(options: OpenGraphOptions): string {
	if (!options.title.trim()) throw new Error('Enter a page title for the Open Graph preview.');
	if (options.imageUrl.trim() && !isHttpUrl(options.imageUrl.trim())) throw new Error('Image URL must be an absolute http:// or https:// URL.');
	if (options.pageUrl.trim() && !isHttpUrl(options.pageUrl.trim())) throw new Error('Page URL must be an absolute http:// or https:// URL.');
	const values: Array<[string, string]> = [
		['og:title', options.title.trim()],
		['og:description', options.description.trim()],
		['og:type', options.type || 'website'],
	];
	if (options.pageUrl.trim()) values.push(['og:url', options.pageUrl.trim()]);
	if (options.imageUrl.trim()) values.push(['og:image', options.imageUrl.trim()]);
	if (options.siteName?.trim()) values.push(['og:site_name', options.siteName.trim()]);
	return values.map(([property, content]) => `<meta property="${property}" content="${escapeHtml(content)}">`).join('\n');
}
