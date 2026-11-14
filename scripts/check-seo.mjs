import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const siteConfig = await readFile(path.join(projectRoot, 'astro.config.mjs'), 'utf8');
const toolsSource = await readFile(path.join(projectRoot, 'src', 'data', 'tools.ts'), 'utf8');
const site = siteConfig.match(/\bsite\s*:\s*['"]([^'"]+)['"]/)?.[1];
const previewBuild = process.env.PUBLIC_SHOW_HIDDEN === 'true';
const failures = [];

if (!site) throw new Error('Could not determine the site URL from astro.config.mjs.');

async function htmlFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(entries.map(async (entry) => {
		const fullPath = path.join(directory, entry.name);
		return entry.isDirectory() ? htmlFiles(fullPath) : entry.isFile() && entry.name.endsWith('.html') ? [fullPath] : [];
	}));
	return nested.flat();
}

async function exists(filePath) {
	try {
		return (await stat(filePath)).isFile();
	} catch (error) {
		if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
		throw error;
	}
}

function attribute(tag, name) {
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return decodeHtml(tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((value) => value !== undefined) ?? '');
}

function decodeHtml(value) {
	return value
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'")
		.replaceAll('&#x27;', "'")
		.replace(/&#(\d+);/g, (entity, number) => String.fromCodePoint(Number(number)))
		.replace(/&#x([\da-f]+);/gi, (entity, number) => String.fromCodePoint(Number.parseInt(number, 16)));
}

function pageUrl(file) {
	const relative = path.relative(distRoot, file).split(path.sep).join('/');
	const route = relative === 'index.html' ? '/' : `/${relative.replace(/index\.html$/, '')}`;
	return new URL(route, site).href;
}

function xmlText(value) {
	return value.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'");
}

const files = await htmlFiles(distRoot);
const pages = [];

for (const file of files) {
	const html = await readFile(file, 'utf8');
	const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
	const descriptionTag = html.match(/<meta\b[^>]*>/gi)?.find((tag) => attribute(tag, 'name').toLowerCase() === 'description');
	const description = descriptionTag ? attribute(descriptionTag, 'content').trim() : '';
	const robotsTag = html.match(/<meta\b[^>]*>/gi)?.find((tag) => attribute(tag, 'name').toLowerCase() === 'robots');
	const noindex = Boolean(robotsTag && /\bnoindex\b/i.test(attribute(robotsTag, 'content')));
	const url = pageUrl(file);
	pages.push({ file, url, title, description, noindex });

	if (!title) failures.push(`${url}: missing <title>.`);
	if (!description) failures.push(`${url}: missing meta description.`);
	if (description.length > 160) failures.push(`${url}: meta description is ${description.length} characters (maximum 160).`);
}

const titles = new Map();
const descriptions = new Map();
for (const page of pages.filter((entry) => !entry.noindex)) {
	const title = page.title.toLocaleLowerCase();
	const description = page.description.toLocaleLowerCase();
	if (titles.has(title)) failures.push(`${page.url}: duplicate indexable title also used by ${titles.get(title)}.`);
	else titles.set(title, page.url);
	if (descriptions.has(description)) failures.push(`${page.url}: duplicate indexable description also used by ${descriptions.get(description)}.`);
	else descriptions.set(description, page.url);
}

const sitemapPath = path.join(distRoot, 'sitemap.xml');
const sitemap = await readFile(sitemapPath, 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)]
	.map((match) => xmlText(match[1].trim()));
const sitemapUrlSet = new Set(sitemapUrls);

if (!previewBuild) {
	for (const page of pages.filter((entry) => entry.noindex)) {
		if (sitemapUrlSet.has(page.url)) failures.push(`${page.url}: noindex page is listed in the sitemap.`);
	}

	const hiddenTools = [...toolsSource.matchAll(/^\s*slug:\s*'([^']+)',([\s\S]*?)^\s*live:\s*(true|false),/gm)]
		.filter((match) => match[3] === 'false')
		.map((match) => match[1]);
	for (const slug of hiddenTools) {
		if (await exists(path.join(distRoot, slug, 'index.html'))) {
			failures.push(`/${slug}/: hidden tool page exists in a production build.`);
		}
	}
}

if (failures.length) {
	console.error(failures.map((failure) => `- ${failure}`).join('\n'));
	console.error(`\nSEO check failed with ${failures.length} issue(s) across ${pages.length} pages.`);
	process.exitCode = 1;
} else {
	console.log(`SEO check passed: ${pages.length} pages, ${pages.filter((page) => !page.noindex).length} indexable, ${sitemapUrls.length} sitemap URLs.`);
}
