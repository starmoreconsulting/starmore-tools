import { describe, expect, it, vi } from 'vitest';
import { onRequest } from './_middleware.js';

describe('canonical host redirects', () => {
	it.each([
		['https://starmore-tools.pages.dev/percentage-calculator/?from=home', 'https://starmoretools.com/percentage-calculator/?from=home'],
		['http://www.starmoretools.com/privacy/', 'https://starmoretools.com/privacy/'],
	])('redirects %s to the primary domain', async (requestUrl, expectedUrl) => {
		const next = vi.fn();
		const response = await onRequest({ request: new Request(requestUrl), next });

		expect(response.status).toBe(301);
		expect(response.headers.get('location')).toBe(expectedUrl);
		expect(next).not.toHaveBeenCalled();
	});

	it('serves the primary domain without redirecting', async () => {
		const response = new Response('ok');
		const next = vi.fn().mockResolvedValue(response);

		await expect(onRequest({ request: new Request('https://starmoretools.com/privacy/'), next })).resolves.toBe(response);
		expect(next).toHaveBeenCalledOnce();
	});
});
