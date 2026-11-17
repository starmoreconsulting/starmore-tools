import { describe, expect, it } from 'vitest';
import { filterDepartmentsWithPublishedTools, tools } from './tools';

describe('published department filtering', () => {
	it('excludes departments with only hidden tools and includes departments with a live tool', () => {
		const fixtureDepartments = [
			{ slug: 'hidden-only' },
			{ slug: 'has-live-tool' },
		];
		const fixtureTools = [
			{ department: 'hidden-only', live: false },
			{ department: 'has-live-tool', live: false },
			{ department: 'has-live-tool', live: true },
		];

		expect(filterDepartmentsWithPublishedTools(fixtureDepartments, fixtureTools))
			.toEqual([{ slug: 'has-live-tool' }]);
		expect(filterDepartmentsWithPublishedTools(fixtureDepartments, fixtureTools, true))
			.toEqual(fixtureDepartments);
	});

	describe('Brand Studio strategy and visual tool pages', () => {
		const slugs = [
			'brand-name-generator',
			'brand-slogan-generator',
			'brand-mission-vision-generator',
			'brand-positioning-assistant',
			'brand-personality-builder',
			'brand-colour-palette-generator',
			'brand-typography-selector',
			'brand-font-pairing-tool',
			'brand-mood-board-creator',
		];
		const entries = slugs.map((slug) => tools.find((tool) => tool.slug === slug)!);

		it('keeps every Phase 9a tool hidden and gives each a unique, short meta description', () => {
			expect(entries).toHaveLength(9);
			expect(entries.every((tool) => tool.live === false)).toBe(true);
			expect(new Set(entries.map((tool) => tool.seoTitle)).size).toBe(entries.length);
			expect(new Set(entries.map((tool) => tool.seoDescription)).size).toBe(entries.length);
			expect(entries.every((tool) => tool.seoDescription.length < 160)).toBe(true);
		});

		it('provides complete, distinct landing-page copy with privacy and limitations', () => {
			expect(entries.every((tool) => (
				tool.department === 'brand-studio'
				&& tool.howTo.length >= 1
				&& tool.faqs.length >= 2
				&& tool.faqs.length <= 3
				&& Boolean(tool.guideCopy)
				&& Boolean(tool.limitations)
				&& tool.privacyNote?.includes('Nothing leaves your device')
			))).toBe(true);
			for (const tool of entries) {
				const visibleCopy = [
					tool.name,
					tool.description,
					tool.guideCopy,
					...tool.howTo,
					...tool.faqs.flatMap((faq) => [faq.question, faq.answer]),
					tool.limitations,
					tool.privacyNote,
				].filter(Boolean).join(' ');
				expect(visibleCopy.trim().split(/\s+/).length).toBeGreaterThanOrEqual(150);
			}
			for (let first = 0; first < entries.length; first += 1) {
				for (let second = first + 1; second < entries.length; second += 1) {
					const a = new Set(entries[first].guideCopy!.toLowerCase().match(/[a-z0-9]+/g));
					const b = new Set(entries[second].guideCopy!.toLowerCase().match(/[a-z0-9]+/g));
					const intersection = [...a].filter((word) => b.has(word)).length;
					expect(intersection / Math.max(a.size, b.size)).toBeLessThan(0.6);
				}
			}
		});
	});

	it('keeps the bundled font diagnostic hidden with distinct preview-only copy', () => {
		const tool = tools.find(({ slug }) => slug === 'brand-font-load-check')!;
		expect(tool.live).toBe(false);
		expect(tool.component).toBe('BrandFontLoadCheck');
		expect(tool.seoDescription.length).toBeLessThan(160);
		const visibleCopy = [
			tool.name,
			tool.description,
			tool.guideCopy,
			...tool.howTo,
			...tool.faqs.flatMap((faq) => [faq.question, faq.answer]),
			tool.limitations,
			tool.privacyNote,
		].filter(Boolean).join(' ');
		expect(visibleCopy.trim().split(/\s+/).length).toBeGreaterThanOrEqual(150);
	});
});
