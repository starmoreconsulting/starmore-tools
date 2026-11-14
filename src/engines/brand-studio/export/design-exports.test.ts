import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { createEmptyBrandKit } from '../../logo-studio/brand/kit';
import { createDefaultProject } from '../../logo-studio/model/types';
import { exportDesignAsset } from './design-exports';
import { exportBrandPack } from './design-exports';

describe('exportBrandPack', () => {
	it('includes the validated brand kit and a README listing every archive file', async () => {
		const kit = createEmptyBrandKit('Pack test');
		const blob = await exportBrandPack(kit, []);
		const archive = unzipSync(new Uint8Array(await blob.arrayBuffer()));
		const paths = Object.keys(archive).sort();
		const readme = strFromU8(archive['README.txt']);

		expect(paths).toEqual(['Brand kit.json', 'README.txt']);
		expect(readme).toContain('- Brand kit.json');
		expect(readme).toContain('- README.txt');
	});

	it('rejects logo projects from the design asset exporter', async () => {
		await expect(exportDesignAsset(createDefaultProject(), 'svg'))
			.rejects.toThrow('Only Brand Studio designs can be exported here.');
	});
});
