const canonicalHosts = new Set(['www.starmoretools.com', 'starmore-tools.pages.dev']);

export async function onRequest({ request, next }) {
	const url = new URL(request.url);
	if (!canonicalHosts.has(url.hostname.toLowerCase())) return next();

	url.protocol = 'https:';
	url.hostname = 'starmoretools.com';
	url.port = '';
	return Response.redirect(url, 301);
}
