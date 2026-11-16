import { describe, expect, it } from 'vitest';
import { filterDepartmentsWithPublishedTools } from './tools';

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
});
