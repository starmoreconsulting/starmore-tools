import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createResumePdf, validateResume, type ResumeInput } from './resume-builder';

const resume: ResumeInput = {
	fullName: 'Jordan Lee',
	professionalTitle: 'Product Designer',
	email: 'jordan@example.com',
	phone: '+1 555 0100',
	location: 'Toronto, Canada',
	website: 'https://example.com',
	summary: 'Product designer focused on clear and accessible digital experiences.',
	skills: 'Research, Prototyping, Accessibility',
	experience: [{
		id: 'role-1',
		jobTitle: 'Senior Product Designer',
		company: 'Northstar',
		location: 'Toronto',
		startDate: '2022-01',
		endDate: 'Present',
		description: 'Led product discovery and design systems.',
	}],
	education: [{
		id: 'education-1',
		qualification: 'Bachelor of Design',
		institution: 'Example University',
		location: 'Toronto',
		startDate: '2016-09',
		endDate: '2020-05',
		details: 'Graduated with distinction.',
	}],
};

describe('resume builder', () => {
	it('accepts a complete resume with work history and education', () => {
		expect(() => validateResume(resume)).not.toThrow();
	});

	it('requires the full name and validates contact details and employment dates', () => {
		expect(() => validateResume({ ...resume, fullName: ' ' })).toThrow('Full name is required');
		expect(() => validateResume({ ...resume, email: 'not-an-email' })).toThrow('valid email');
		expect(() => validateResume({ ...resume, website: 'not a url' })).toThrow('valid website');
		expect(() => validateResume({ ...resume, experience: [{ ...resume.experience[0], startDate: '2022-13' }] })).toThrow('start date must use YYYY-MM');
		expect(() => validateResume({ ...resume, experience: [{ ...resume.experience[0], startDate: '2023-01', endDate: '2022-12' }] })).toThrow('cannot be earlier');
	});

	it('limits work and education entries and rejects duplicate entry IDs', () => {
		expect(() => validateResume({ ...resume, experience: Array.from({ length: 9 }, (_, index) => ({ ...resume.experience[0], id: `role-${index}` })) })).toThrow('up to 8 work experience');
		expect(() => validateResume({ ...resume, education: Array.from({ length: 9 }, (_, index) => ({ ...resume.education[0], id: `education-${index}` })) })).toThrow('up to 8 education');
		expect(() => validateResume({ ...resume, education: [{ ...resume.education[0], id: 'role-1' }] })).toThrow('unique identifiers');
	});

	it('creates a readable PDF and paginates longer resumes', async () => {
		const bytes = await createResumePdf(resume);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
		const longResume = {
			...resume,
			summary: 'Professional experience and achievements. '.repeat(30),
			experience: Array.from({ length: 8 }, (_, index) => ({
				...resume.experience[0],
				id: `role-${index}`,
				jobTitle: `Role ${index + 1}`,
				description: 'Delivered measurable outcomes across multiple initiatives. '.repeat(15),
			})),
		};
		const longPdf = await PDFDocument.load(await createResumePdf(longResume));
		expect(longPdf.getPageCount()).toBeGreaterThan(1);
	});

	it('reports characters unsupported by the built-in PDF font', async () => {
		await expect(createResumePdf({ ...resume, fullName: 'Jordan 🚀 Lee' })).rejects.toThrow('basic Latin and Western European');
	});
});
