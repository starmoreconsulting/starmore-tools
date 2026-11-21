// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { createDefaultElement, createDefaultProject } from '../model/types';
import ExportCenter from './ExportCenter';

const mocks = vi.hoisted(() => ({
	canva: vi.fn(),
	download: vi.fn(),
	findUnbundled: vi.fn(),
	fallback: vi.fn(),
	pdf: vi.fn(),
	print: vi.fn(),
	psd: vi.fn(),
	raster: vi.fn(),
	svg: vi.fn(),
}));

vi.mock('../export/canva', () => ({ exportCanvaReadyZip: mocks.canva }));
vi.mock('../export/pdf', () => ({ exportSvgToPdf: mocks.pdf }));
vi.mock('../export/print', () => ({ exportPrintPdf: mocks.print }));
vi.mock('../export/psd', () => ({ exportProjectToPsd: mocks.psd }));
vi.mock('../export/raster', () => ({
	downloadBlob: mocks.download,
	renderSvgToRaster: mocks.raster,
}));
vi.mock('../export/raster-fallback', () => ({
	printDimensionsToMm: (width: number, height: number) => ({ widthMm: width * 25.4 / 72, heightMm: height * 25.4 / 72 }),
	rasterizeSvgForPrintFallback: mocks.fallback,
}));
vi.mock('../export/svg', () => ({ exportProjectToSvg: mocks.svg }));
vi.mock('../export/outline', () => ({ findUnbundledCharacters: mocks.findUnbundled }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function createProject() {
	const project = createDefaultProject('Fallback Logo');
	project.variants.primary = [
		createDefaultElement('text', {
			id: 'brand-name',
			text: 'Café Zoé 🌿 Studio',
			fontFamily: 'Inter',
			width: 400,
			height: 80,
		}),
	];
	return project;
}

async function clickButton(name: string): Promise<void> {
	const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === name);
	if (!button) throw new Error(`Button not found: ${name}`);
	await act(async () => {
		button.click();
		await new Promise((resolve) => setTimeout(resolve, 10));
	});
}

async function mountExportCenter(project = createProject()): Promise<void> {
	await act(async () => {
		root.render(
			<ExportCenter
				project={project}
				activeVariant="primary"
				reference={null}
				onClose={() => undefined}
			/>,
		);
	});
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	mocks.svg.mockImplementation(async () => ({
		svg: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><text>Café Zoé 🌿 Studio</text></svg>',
		warnings: [],
		unsupportedChars: ['🌿'],
		elementsAffected: ['brand-name'],
	}));
	mocks.raster.mockResolvedValue({ blob: new Blob(['png']), width: 10, height: 10 });
	mocks.pdf.mockResolvedValue(new Blob(['vector pdf']));
	mocks.print.mockResolvedValue({ blob: new Blob(['pdf']), pageSizes: [] });
	mocks.fallback.mockResolvedValue({ rasterDataUrl: 'data:image/png;base64,AA==', effectiveDpi: 600 });
	mocks.psd.mockResolvedValue(new Uint8Array([1, 2, 3]));
	mocks.canva.mockResolvedValue({
		blob: new Blob(['canva zip']),
		warnings: ['Characters “🌿” remain live text in logo.svg and were rasterized at 600 DPI in logo.pdf.'],
	});
	mocks.findUnbundled.mockResolvedValue(['🌿']);
	mocks.download.mockReset();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.clearAllMocks();
});

describe('Logo Studio export fallbacks', () => {
	it.each([
		['SVG', 'Download SVG', 'remain live text'],
		['PNG', 'Download PNG', "browser's font fallback"],
		['JPG', 'Download JPG', "browser's font fallback"],
		['PDF', 'Download PDF', '600 DPI'],
		['Print PDF', 'Download Print PDF', '600 DPI'],
		['Variants sheet PDF', 'Download variants sheet', '600 DPI'],
		['Layered PSD', 'Download Layered PSD', "browser's font fallback"],
		['Canva-ready ZIP', 'Download Canva-ready ZIP', '600 DPI'],
		['All variants ZIP', 'Export all variants (ZIP)', '600 DPI'],
	])('creates %s with an unsupported-character notice', async (_label, buttonName, noticeText) => {
		await mountExportCenter();
		await clickButton(buttonName);

		expect(mocks.download).toHaveBeenCalledWith(expect.any(Blob), expect.any(String));
		expect(container.querySelector('.logo-export-warning')?.textContent).toContain('🌿');
		expect(container.querySelector('.logo-export-warning')?.textContent).toContain(noticeText);
	});

	it('keeps SVG text live when outline conversion is disabled', async () => {
		await mountExportCenter();
		const outline = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
		expect(outline).not.toBeNull();
		await act(async () => outline?.click());
		await clickButton('Download SVG');

		expect(mocks.download).toHaveBeenCalledWith(expect.any(Blob), expect.any(String));
		expect(container.querySelector('.logo-export-warning')?.textContent).toContain('remain live text');
	});

	it('keeps plain Latin PDF output vector without invoking the image fallback', async () => {
		mocks.svg.mockImplementation(async () => ({
			svg: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><path d="M0 0"/></svg>',
			warnings: [],
			unsupportedChars: [],
			elementsAffected: [],
		}));
		await mountExportCenter();
		await clickButton('Download PDF');

		expect(mocks.pdf).toHaveBeenCalledOnce();
		expect(mocks.fallback).not.toHaveBeenCalled();
		expect(mocks.download).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.pdf$/));
	});

	it('continues an all-variants ZIP after an individual file fails and records the file in README', async () => {
		mocks.raster.mockImplementation(async (_svg: string, options: { format: string }) => {
			if (options.format === 'jpg') throw new Error('test raster failure');
			return { blob: new Blob(['png']), width: 10, height: 10 };
		});
		await mountExportCenter();
		await clickButton('Export all variants (ZIP)');

		const [archiveBlob] = mocks.download.mock.calls[0] as [Blob, string];
		const archive = unzipSync(new Uint8Array(await archiveBlob.arrayBuffer()));
		const readme = strFromU8(archive['README.txt']);
		expect(readme).toContain('Files that could not be created:');
		expect(readme).toContain('JPG/Fallback Logo-primary.jpg');
		expect(readme).toContain('test raster failure');
		expect(readme).toContain('PDF/Fallback Logo-primary.pdf');
	});
});
