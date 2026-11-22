import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	createBusinessProposalPdf,
	formatBusinessProposalAmount,
	validateBusinessProposal,
	type BusinessProposalInput,
} from './business-proposal';

const proposal: BusinessProposalInput = {
	providerName: 'Starmore Studio',
	providerDetails: '123 Market Road\nLagos, Nigeria',
	clientName: 'Example Client',
	clientDetails: '45 Client Street',
	proposalNumber: 'PROP-2026-001',
	proposalDate: '2026-11-22',
	validUntil: '2026-12-22',
	projectTitle: 'Website redesign',
	executiveSummary: 'A focused redesign to improve the client website experience.',
	clientNeeds: 'The current website is difficult to use on mobile.',
	proposedSolution: 'Research, redesign, and build a responsive website.',
	scope: 'Discovery, design, implementation, and handover.',
	deliverables: 'A responsive website, source files, and handover notes.',
	timeline: 'Four weeks from project kickoff.',
	currency: 'NGN',
	investment: 78500.5,
	terms: 'Final timeline begins after approval and receipt of required content.',
};

describe('business proposal', () => {
	it('validates a complete proposal and supports omitting the optional investment', () => {
		expect(() => validateBusinessProposal(proposal)).not.toThrow();
		expect(() => validateBusinessProposal({ ...proposal, investment: null })).not.toThrow();
	});

	it('requires the project sections and valid date order', () => {
		expect(() => validateBusinessProposal({ ...proposal, executiveSummary: ' ' })).toThrow('Executive summary is required');
		expect(() => validateBusinessProposal({ ...proposal, validUntil: '2026-11-21' })).toThrow('cannot be earlier');
		expect(() => validateBusinessProposal({ ...proposal, proposalDate: '2026-02-30' })).toThrow('valid proposal and expiry dates');
		expect(() => validateBusinessProposal({ ...proposal, clientName: '' })).toThrow('Client name is required');
	});

	it('rejects invalid or unsafe investment amounts and overly long fields', () => {
		expect(() => validateBusinessProposal({ ...proposal, investment: -1 })).toThrow('non-negative amount');
		expect(() => validateBusinessProposal({ ...proposal, investment: Number.MAX_VALUE })).toThrow('supported limit');
		expect(() => validateBusinessProposal({ ...proposal, terms: 'a'.repeat(2001) })).toThrow('2000 characters or fewer');
	});

	it('formats an investment estimate with the selected currency', () => {
		expect(formatBusinessProposalAmount(1234.5, 'USD')).toBe('USD 1,234.50');
		expect(() => formatBusinessProposalAmount(Number.NaN, 'USD')).toThrow('valid investment amount');
	});

	it('creates a PDF proposal with multiple pages for detailed project content', async () => {
		const longText = Array.from({ length: 10 }, (_, index) => `Phase ${index + 1}: ${'project planning and delivery '.repeat(5)}`).join('\n');
		const document = await PDFDocument.load(await createBusinessProposalPdf({
			...proposal,
			executiveSummary: longText,
			clientNeeds: longText,
			proposedSolution: longText,
			scope: longText,
			deliverables: longText,
			timeline: longText,
			terms: longText,
		}));
		expect(document.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the standard PDF font', async () => {
		await expect(createBusinessProposalPdf({ ...proposal, clientName: 'Client 東京' })).rejects.toThrow('supports basic Latin');
	});
});
