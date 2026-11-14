import type { APIRoute } from 'astro';
import { departments, tools } from '../data/tools';
import { industryTemplateCategories } from '../engines/logo-studio/templates/industry-catalog';
import { mockupCategoryPages } from '../engines/logo-studio/mockups/categories';

function escapeXml(value: string) {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export const GET: APIRoute = ({ site }) => {
	if (!site) throw new Error('Set the Astro site URL to generate the sitemap.');

	const logoStudioIsLive = tools.some((tool) => tool.slug === 'logo-studio' && tool.live);
	const logoStudioRoutes = logoStudioIsLive ? [
		'/logo-studio/',
		'/logo-studio/templates/',
		'/logo-studio/mockups/',
		...industryTemplateCategories.map((category) => `/logo-studio/templates/${category.slug}/`),
		...mockupCategoryPages.map((category) => `/logo-studio/mockups/${category.slug}/`),
	] : [];
	const routes = [...new Set([
		'',
		'/about/',
		'/privacy/',
		'/disclosure/',
		'/contact/',
		...logoStudioRoutes,
		...departments.map((department) => `/departments/${department.slug}/`),
		...tools.filter((tool) => tool.live).map((tool) => `/${tool.slug}/`),
	])];
	const entries = routes.map((route) => `  <url><loc>${escapeXml(new URL(route, site).href)}</loc></url>`).join('\n');
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;

	return new Response(sitemap, {
		headers: { 'Content-Type': 'application/xml; charset=utf-8' },
	});
};
