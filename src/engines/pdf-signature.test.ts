import { describe, expect, it } from 'vitest';
import { normalizePdfSignatureOptions, selectedSignaturePages } from './pdf-signature';

describe('PDF signature helpers', () => {
	it('validates signature placement settings', () => {
		expect(normalizePdfSignatureOptions('bottom-center', 150, 36)).toEqual({
			position: 'bottom-center',
			width: 150,
			margin: 36,
		});
		expect(() => normalizePdfSignatureOptions('bottom-right', 40, 36)).toThrow('Signature width');
		expect(() => normalizePdfSignatureOptions('bottom-left', 150, 145)).toThrow('Margin');
	});

	it('selects all or specified pages using one-based ranges', () => {
		expect(selectedSignaturePages(true, '', 4)).toEqual([0, 1, 2, 3]);
		expect(selectedSignaturePages(false, '1, 3-4', 4)).toEqual([0, 2, 3]);
		expect(() => selectedSignaturePages(false, '0', 4)).toThrow('outside the document');
		expect(() => selectedSignaturePages(false, '', 4)).toThrow('Enter page numbers');
	});
});
