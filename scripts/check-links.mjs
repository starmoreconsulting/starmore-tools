import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const config = await readFile(path.join(projectRoot, 'astro.config.mjs'), 'utf8');
const site = config.match(/\bsite\s*:\s*['"]([^'"]+)['"]/)?.[1];

if (!site) {
	throw new Error('Could not determine the site URL from astro.config.mjs.');
}

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

function targetFiles(url) {
	let pathname;
	try {
		pathname = decodeURIComponent(url.pathname);
	} catch {
		return [];
	}

	const resolved = path.resolve(distRoot, `.${pathname}`);
	if (resolved !== distRoot && !resolved.startsWith(`${distRoot}${path.sep}`)) return [];
	if (pathname.endsWith('/')) return [path.join(resolved, 'index.html')];
	if (path.extname(pathname)) return [resolved];
	return [resolved, path.join(resolved, 'index.html')];
}

const files = await htmlFiles(distRoot);
const failures = [];

for (const file of files) {
	const html = await readFile(file, 'utf8');
	const links = [...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
	const broken = new Set();

	for (const href of links) {
		let url;
		try {
			url = new URL(href, `${site}/`);
		} catch {
			continue;
		}

		if (url.origin !== new URL(site).origin) continue;
		if (!href.startsWith('/') && !href.startsWith(site)) continue;

		const targets = targetFiles(url);
		let found = false;
		for (const target of targets) {
			if (await exists(target)) {
				found = true;
				break;
			}
		}
		if (!found) broken.add(href);
	}

	if (broken.size) {
		const page = `/${path.relative(distRoot, file).split(path.sep).join('/')}`;
		failures.push({ page, links: [...broken].sort() });
	}
}

if (failures.length) {
	for (const failure of failures) {
		console.log(`${failure.page}`);
		for (const link of failure.links) console.log(`  ${link}`);
	}
	console.log(`\n${failures.reduce((total, entry) => total + entry.links.length, 0)} broken internal link(s) across ${failures.length} page(s).`);
	process.exitCode = 1;
} else {
	console.log(`No broken internal links found across ${files.length} HTML pages.`);
}
