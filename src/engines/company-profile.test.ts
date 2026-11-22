import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
	COMPANY_PROFILE_MAX_YEAR,
	createCompanyProfilePdf,
	validateCompanyProfile,
	type CompanyProfileInput,
} from './company-profile';

const profile: CompanyProfileInput = {
	companyName: 'Starmore Studio',
	tagline: 'Small tools. Big momentum.',
	industry: 'Digital services',
	foundedYear: 2020,
	headquarters: 'Lagos, Nigeria',
	website: 'https://example.com',
	email: 'hello@example.com',
	phone: '+234 800 000 0000',
	overview: 'Starmore Studio creates practical digital tools for people and businesses.',
	mission: 'Make useful tools accessible.',
	vision: 'A world where everyday work feels simpler.',
	values: 'Clarity, privacy, and usefulness.',
	services: 'Web development\nDigital products\nConsulting',
	market: 'Individuals and small businesses.',
	differentiators: 'We focus on clear, browser-based tools that respect privacy.',
};

describe('company profile', () => {
	it('accepts a complete profile and optional empty details', () => {
		expect(() => validateCompanyProfile(profile)).not.toThrow();
		expect(() => validateCompanyProfile({
			...profile,
			tagline: '',
			industry: '',
			foundedYear: null,
			headquarters: '',
			website: '',
			email: '',
			phone: '',
			mission: '',
			vision: '',
			values: '',
			services: '',
			market: '',
			differentiators: '',
		})).not.toThrow();
	});

	it('requires the company name and overview and validates the founded year', () => {
		expect(() => validateCompanyProfile({ ...profile, companyName: ' ' })).toThrow('Company name is required');
		expect(() => validateCompanyProfile({ ...profile, overview: '' })).toThrow('Company overview is required');
		expect(() => validateCompanyProfile({ ...profile, foundedYear: 1799 })).toThrow('Founded year must be between');
		expect(() => validateCompanyProfile({ ...profile, foundedYear: COMPANY_PROFILE_MAX_YEAR + 1 })).toThrow('Founded year must be between');
		expect(() => validateCompanyProfile({ ...profile, foundedYear: 2020.5 })).toThrow('Founded year must be between');
	});

	it('rejects fields longer than the documented limit', () => {
		expect(() => validateCompanyProfile({ ...profile, overview: 'a'.repeat(2001) })).toThrow('2000 characters or fewer');
	});

	it('creates a multi-page profile PDF with long sections', async () => {
		const longOverview = 'Company overview and service details for our clients. '.repeat(34);
		const document = await PDFDocument.load(await createCompanyProfilePdf({ ...profile, overview: longOverview }));
		expect(document.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the standard PDF font', async () => {
		await expect(createCompanyProfilePdf({ ...profile, companyName: 'Studio 東京' })).rejects.toThrow('supports basic Latin');
	});
});
