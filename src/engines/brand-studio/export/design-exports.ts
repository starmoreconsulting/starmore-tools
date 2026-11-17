import { strToU8, zipSync } from 'fflate';
import { exportKit, type BrandKit } from '../../logo-studio/brand/kit';
import { exportProjectToSvg } from '../../logo-studio/export/svg';
import { renderSvgToRaster, type RasterFormat, type RasterScale } from '../../logo-studio/export/raster';
import { exportPrintPdf } from '../../logo-studio/export/print';
import { exportSvgToPdf } from '../../logo-studio/export/pdf';
import { findUnbundledCharacters } from '../../logo-studio/export/outline';
import type { LogoProject } from '../../logo-studio/model/types';
import { choosePrintRasterScale, getCurrentPrintRasterLimits } from './print-raster-scale';

export type DesignExportFormat = 'svg' | 'png' | 'jpg' | 'pdf';

export interface DesignExportNotice {
	type: 'live-svg-text' | 'raster-pdf';
	text: string[];
	unbundledCharacters: string[];
	effectiveDpi?: number;
}

export interface DesignExportResult {
	blob: Blob;
	notice?: DesignExportNotice;
}

function safeFileName(value: string): string {
	return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'brand-design';
}

function isPrintDesign(project: LogoProject): boolean {
	return /^(business-card-front|business-card-back|letterhead|envelope):/.test(project.generation?.layoutId ?? '');
}

function isSocialDesign(project: LogoProject): boolean {
	return /^(instagram-post-square|instagram-post-portrait|instagram-story|facebook-cover|youtube-banner|linkedin-banner):/.test(project.generation?.layoutId ?? '');
}

function isMoodBoard(project: LogoProject): boolean {
	return project.generation?.layoutId.startsWith('moodboard:') ?? false;
}

function blobDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error('The print artwork could not be prepared for PDF export.'));
		};
		reader.onerror = () => reject(new Error('The print artwork could not be prepared for PDF export.'));
		reader.readAsDataURL(blob);
	});
}

export async function exportDesignAssetWithReport(
	project: LogoProject,
	format: DesignExportFormat,
	scale: number = 1,
): Promise<DesignExportResult> {
	if (project.kind !== 'design') throw new Error('Only Brand Studio designs can be exported here.');
	const vector = await exportProjectToSvg(project, { outlineText: format === 'pdf' });
	if (format === 'svg') {
		const text = /<text(?:\s|>)/i.test(vector.svg)
			? project.variants.primary.filter((element) => element.type === 'text').map((element) => element.text ?? '').filter(Boolean)
			: [];
		return {
			blob: new Blob([vector.svg], { type: 'image/svg+xml;charset=utf-8' }),
			...(text.length ? {
				notice: {
					type: 'live-svg-text' as const,
					text,
					unbundledCharacters: await findUnbundledCharacters(project),
				},
			} : {}),
		};
	}
	if (format === 'png' || format === 'jpg') {
		const raster = await renderSvgToRaster(vector.svg, {
			width: project.artboard.width,
			height: project.artboard.height,
			format: format as RasterFormat,
			scale,
			background: format === 'jpg' ? (project.artboard.background === 'transparent' ? '#ffffff' : project.artboard.background) : undefined,
		});
		return { blob: raster.blob };
	}
	if (isPrintDesign(project)) {
		const remainingText = /<text(?:\s|>)/i.test(vector.svg);
		let rasterDataUrl: string | undefined;
		let notice: DesignExportNotice | undefined;
		if (remainingText) {
			const choice = choosePrintRasterScale(project.artboard.width, project.artboard.height, getCurrentPrintRasterLimits());
			const unbundledCharacters = await findUnbundledCharacters(project);
			const raster = await renderSvgToRaster(vector.svg, {
				width: project.artboard.width,
				height: project.artboard.height,
				format: 'png',
				scale: choice.scale,
				background: project.artboard.background === 'transparent' ? undefined : project.artboard.background,
			});
			rasterDataUrl = await blobDataUrl(raster.blob);
			notice = {
				type: 'raster-pdf',
				text: project.variants.primary.filter((element) => element.type === 'text').map((element) => element.text ?? '').filter(Boolean),
				unbundledCharacters,
				effectiveDpi: choice.effectiveDpi,
			};
		}
		const result = await exportPrintPdf([{
			svg: vector.svg,
			rasterDataUrl,
			width: project.artboard.width,
			height: project.artboard.height,
			unit: 'mm',
			background: project.artboard.background,
		}], { preset: 'standard', extendBackgroundColourIntoBleed: true });
		return { blob: result.blob, ...(notice ? { notice } : {}) };
	}
	if (isSocialDesign(project) || isMoodBoard(project)) {
		if (project.generation?.layoutId === 'moodboard:a4-landscape') {
			const result = await exportPrintPdf([{
				svg: vector.svg,
				width: 297,
				height: 210,
				unit: 'mm',
				background: project.artboard.background,
			}], { preset: 'standard', extendBackgroundColourIntoBleed: true });
			return { blob: result.blob };
		}
		return { blob: await exportSvgToPdf(vector.svg, project.artboard.width, project.artboard.height) };
	}
	throw new Error('The design format is not supported for PDF export.');
}

export async function exportDesignAsset(
	project: LogoProject,
	format: DesignExportFormat,
	scale: RasterScale = 1,
): Promise<Blob> {
	return (await exportDesignAssetWithReport(project, format, scale)).blob;
}

async function addLogoVariantFiles(files: Record<string, Uint8Array>, kit: BrandKit): Promise<string[]> {
	const logo = kit.logo;
	if (!logo) return [];
	const outputPaths: string[] = [];
	for (const [variant, elements] of Object.entries(logo.variants)) {
		const project: LogoProject = {
			...logo,
			artboard: {
				...logo.artboard,
				background: logo.variantBackgrounds?.[variant] ?? logo.artboard.background,
			},
			variants: { primary: elements },
		};
		const fileBase = `${safeFileName(logo.name)}-${safeFileName(variant)}`;
		const svgResult = await exportProjectToSvg(project, { outlineText: false });
		const svgPath = `Logo variants/SVG/${fileBase}.svg`;
		files[svgPath] = strToU8(svgResult.svg);
		outputPaths.push(svgPath);
		for (const format of ['png', 'jpg'] as const) {
			const raster = await renderSvgToRaster(svgResult.svg, {
				width: logo.artboard.width,
				height: logo.artboard.height,
				format,
				scale: 1,
				background: format === 'jpg' && project.artboard.background === 'transparent' ? '#ffffff' : project.artboard.background,
			});
			const path = `Logo variants/${format.toUpperCase()}/${fileBase}.${format}`;
			files[path] = new Uint8Array(await raster.blob.arrayBuffer());
			outputPaths.push(path);
		}
		const pdfVector = await exportProjectToSvg(project, { outlineText: true });
		const pdf = await exportSvgToPdf(pdfVector.svg, logo.artboard.width, logo.artboard.height);
		const pdfPath = `Logo variants/PDF/${fileBase}.pdf`;
		files[pdfPath] = new Uint8Array(await pdf.arrayBuffer());
		outputPaths.push(pdfPath);
	}
	return outputPaths;
}

export async function exportBrandPack(kit: BrandKit, designs: readonly LogoProject[]): Promise<Blob> {
	const files: Record<string, Uint8Array> = {};
	const included: string[] = [];
	const brandKit = exportKit(kit);
	files['Brand kit.json'] = new Uint8Array(await brandKit.blob.arrayBuffer());
	included.push('Brand kit.json');
	for (const design of designs) {
		if (design.kind !== 'design' || design.brandName !== kit.name) continue;
		const name = safeFileName(design.name);
		if (isPrintDesign(design)) {
			const pdf = await exportDesignAsset(design, 'pdf');
			const path = `Print PDFs/${name}-print.pdf`;
			files[path] = new Uint8Array(await pdf.arrayBuffer());
			included.push(path);
		} else if (isSocialDesign(design)) {
			for (const scale of [1, 2] as const) {
				const png = await exportDesignAsset(design, 'png', scale);
				const path = `Social PNGs/${name}-${scale}x.png`;
				files[path] = new Uint8Array(await png.arrayBuffer());
				included.push(path);
			}
		}
	}
	included.push(...await addLogoVariantFiles(files, kit));
	const readme = [
		`${kit.name} — Brand pack`,
		'',
		'Created locally by Starmore Tools. Files are listed below.',
		...included.map((path) => `- ${path}`),
		'- README.txt',
		'',
		'Print PDFs include 3 mm bleed and crop marks. Social PNGs are included at 1× and 2×.',
		'Logo variants include SVG, PNG, JPG, and screen PDF exports.',
	].join('\n');
	files['README.txt'] = strToU8(readme);
	const archive = zipSync(files, { level: 6 });
	return new Blob([new Uint8Array(archive)], { type: 'application/zip' });
}
