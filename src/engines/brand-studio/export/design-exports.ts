import { strToU8, zipSync } from 'fflate';
import { exportKit, type BrandKit } from '../../logo-studio/brand/kit';
import { exportProjectToSvg } from '../../logo-studio/export/svg';
import { renderSvgToRaster, type RasterFormat, type RasterScale } from '../../logo-studio/export/raster';
import { exportPrintPdf } from '../../logo-studio/export/print';
import { exportSvgToPdf } from '../../logo-studio/export/pdf';
import { printDimensionsToMm, rasterizeSvgForPrintFallback } from '../../logo-studio/export/raster-fallback';
import type { LogoProject } from '../../logo-studio/model/types';

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
			...(vector.unsupportedChars.length ? {
				notice: {
					type: 'live-svg-text' as const,
					text,
					unbundledCharacters: vector.unsupportedChars,
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
		let rasterDataUrl: string | undefined;
		let notice: DesignExportNotice | undefined;
		if (vector.unsupportedChars.length) {
			const fallback = await rasterizeSvgForPrintFallback(vector.svg, project.artboard.width, project.artboard.height);
			rasterDataUrl = fallback.rasterDataUrl;
			notice = {
				type: 'raster-pdf',
				text: project.variants.primary.filter((element) => element.type === 'text').map((element) => element.text ?? '').filter(Boolean),
				unbundledCharacters: vector.unsupportedChars,
				effectiveDpi: fallback.effectiveDpi,
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
			const fallback = vector.unsupportedChars.length
				? await rasterizeSvgForPrintFallback(vector.svg, 297, 210)
				: undefined;
			const result = await exportPrintPdf([{
				svg: vector.svg,
				...(fallback ? { rasterDataUrl: fallback.rasterDataUrl } : {}),
				width: 297,
				height: 210,
				unit: 'mm',
				background: project.artboard.background,
			}], { preset: 'standard', extendBackgroundColourIntoBleed: true });
			return {
				blob: result.blob,
				...(fallback ? {
					notice: {
						type: 'raster-pdf' as const,
						text: project.variants.primary.filter((element) => element.type === 'text').map((element) => element.text ?? '').filter(Boolean),
						unbundledCharacters: vector.unsupportedChars,
						effectiveDpi: fallback.effectiveDpi,
					},
				} : {}),
			};
		}
		if (vector.unsupportedChars.length) {
			const { widthMm, heightMm } = printDimensionsToMm(project.artboard.width, project.artboard.height, 'px');
			const fallback = await rasterizeSvgForPrintFallback(vector.svg, widthMm, heightMm);
			const result = await exportPrintPdf([{
				svg: vector.svg,
				rasterDataUrl: fallback.rasterDataUrl,
				width: project.artboard.width,
				height: project.artboard.height,
				unit: 'px',
				background: project.artboard.background,
			}], { preset: 'screen' });
			return {
				blob: result.blob,
				notice: {
					type: 'raster-pdf',
					text: project.variants.primary.filter((element) => element.type === 'text').map((element) => element.text ?? '').filter(Boolean),
					unbundledCharacters: vector.unsupportedChars,
					effectiveDpi: fallback.effectiveDpi,
				},
			};
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

function errorText(cause: unknown): string {
	return cause instanceof Error ? cause.message : 'Unknown export error.';
}

async function addLogoVariantFiles(
	files: Record<string, Uint8Array>,
	kit: BrandKit,
	fallbackNotes: string[],
	failedFiles: string[],
): Promise<string[]> {
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
		const svgPath = `Logo variants/SVG/${fileBase}.svg`;
		let svgResult: Awaited<ReturnType<typeof exportProjectToSvg>> | undefined;
		try {
			svgResult = await exportProjectToSvg(project, { outlineText: false });
			files[svgPath] = strToU8(svgResult.svg);
			outputPaths.push(svgPath);
			if (svgResult.unsupportedChars.length) {
				fallbackNotes.push(`${svgPath}: Characters ${svgResult.unsupportedChars.map((character) => `“${character}”`).join(', ')} remain live text. Remove unsupported characters for a fully vector file.`);
			}
		} catch (cause) {
			console.error('Brand pack file export failed.', svgPath, cause);
			failedFiles.push(`${svgPath} — ${errorText(cause)}`);
		}
		for (const format of ['png', 'jpg'] as const) {
			const path = `Logo variants/${format.toUpperCase()}/${fileBase}.${format}`;
			try {
				const vector = svgResult ?? await exportProjectToSvg(project, { outlineText: false });
				const raster = await renderSvgToRaster(vector.svg, {
					width: logo.artboard.width,
					height: logo.artboard.height,
					format,
					scale: 1,
					background: format === 'jpg' && project.artboard.background === 'transparent' ? '#ffffff' : project.artboard.background,
				});
				files[path] = new Uint8Array(await raster.blob.arrayBuffer());
				outputPaths.push(path);
			} catch (cause) {
				console.error('Brand pack file export failed.', path, cause);
				failedFiles.push(`${path} — ${errorText(cause)}`);
			}
		}
		const pdfPath = `Logo variants/PDF/${fileBase}.pdf`;
		try {
			const pdfVector = await exportProjectToSvg(project, { outlineText: true });
			let blob: Blob;
			if (pdfVector.unsupportedChars.length) {
				const { widthMm, heightMm } = printDimensionsToMm(logo.artboard.width, logo.artboard.height, 'px');
				const fallback = await rasterizeSvgForPrintFallback(pdfVector.svg, widthMm, heightMm);
				const pdf = await exportPrintPdf([{
					svg: pdfVector.svg,
					rasterDataUrl: fallback.rasterDataUrl,
					width: logo.artboard.width,
					height: logo.artboard.height,
					unit: 'px',
					background: project.artboard.background,
				}], { preset: 'screen' });
				blob = pdf.blob;
				fallbackNotes.push(`${pdfPath}: Characters ${pdfVector.unsupportedChars.map((character) => `“${character}”`).join(', ')} were rasterized at ${Math.round(fallback.effectiveDpi)} DPI. Remove unsupported characters for a fully vector file.`);
			} else {
				blob = await exportSvgToPdf(pdfVector.svg, logo.artboard.width, logo.artboard.height);
			}
			files[pdfPath] = new Uint8Array(await blob.arrayBuffer());
			outputPaths.push(pdfPath);
		} catch (cause) {
			console.error('Brand pack file export failed.', pdfPath, cause);
			failedFiles.push(`${pdfPath} — ${errorText(cause)}`);
		}
	}
	return outputPaths;
}

export interface BrandPackExportResult {
	blob: Blob;
	fallbackNotes: string[];
	failedFileCount: number;
}

export async function exportBrandPackWithReport(
	kit: BrandKit,
	designs: readonly LogoProject[],
): Promise<BrandPackExportResult> {
	const files: Record<string, Uint8Array> = {};
	const included: string[] = [];
	const failedFiles: string[] = [];
	const fallbackNotes: string[] = [];
	try {
		const brandKit = exportKit(kit);
		files['Brand kit.json'] = new Uint8Array(await brandKit.blob.arrayBuffer());
		included.push('Brand kit.json');
	} catch (cause) {
		console.error('Brand pack file export failed.', 'Brand kit.json', cause);
		failedFiles.push(`Brand kit.json — ${errorText(cause)}`);
	}
	for (const design of designs) {
		if (design.kind !== 'design' || design.brandName !== kit.name) continue;
		const name = safeFileName(design.name);
		if (isPrintDesign(design)) {
			const path = `Print PDFs/${name}-print.pdf`;
			try {
				const result = await exportDesignAssetWithReport(design, 'pdf');
				files[path] = new Uint8Array(await result.blob.arrayBuffer());
				included.push(path);
				if (result.notice?.type === 'raster-pdf') {
					fallbackNotes.push(`${path}: Characters ${result.notice.unbundledCharacters.map((character) => `“${character}”`).join(', ')} were rasterized at ${Math.round(result.notice.effectiveDpi ?? 0)} DPI. Remove unsupported characters for a fully vector file.`);
				}
			} catch (cause) {
				console.error('Brand pack file export failed.', path, cause);
				failedFiles.push(`${path} — ${errorText(cause)}`);
			}
		} else if (isSocialDesign(design)) {
			for (const scale of [1, 2] as const) {
				const path = `Social PNGs/${name}-${scale}x.png`;
				try {
					const png = await exportDesignAsset(design, 'png', scale);
					files[path] = new Uint8Array(await png.arrayBuffer());
					included.push(path);
				} catch (cause) {
					console.error('Brand pack file export failed.', path, cause);
					failedFiles.push(`${path} — ${errorText(cause)}`);
				}
			}
		}
	}
	included.push(...await addLogoVariantFiles(files, kit, fallbackNotes, failedFiles));
	const readme = [
		`${kit.name} — Brand pack`,
		'',
		'Created locally by Starmore Tools. Files are listed below.',
		...included.map((path) => `- ${path}`),
		'- README.txt',
		'',
		'Print PDFs include 3 mm bleed and crop marks. Social PNGs are included at 1× and 2×.',
		'Logo variants include SVG, PNG, JPG, and screen PDF exports.',
		...(fallbackNotes.length ? ['', 'Unsupported-character fallback:', ...fallbackNotes.map((note) => `- ${note}`)] : []),
		...(failedFiles.length ? ['', 'Files that could not be created:', ...failedFiles.map((path) => `- ${path}`)] : []),
	].join('\n');
	files['README.txt'] = strToU8(readme);
	const archive = zipSync(files, { level: 6 });
	return {
		blob: new Blob([new Uint8Array(archive)], { type: 'application/zip' }),
		fallbackNotes,
		failedFileCount: failedFiles.length,
	};
}

export async function exportBrandPack(kit: BrandKit, designs: readonly LogoProject[]): Promise<Blob> {
	return (await exportBrandPackWithReport(kit, designs)).blob;
}
