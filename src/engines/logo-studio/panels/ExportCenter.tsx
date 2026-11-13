import { useEffect, useMemo, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import { createProjectFile, createProjectFileWithReference } from '../export/project-file';
import { downloadBlob, renderSvgToRaster, type RasterScale } from '../export/raster';
import { exportSvgToPdf } from '../export/pdf';
import { exportPrintPdf, type PrintPdfPage, type PrintPreset, type PrintUnit } from '../export/print';
import { exportProjectToSvg } from '../export/svg';
import type { LogoProject } from '../model/types';
import type { ReferenceLayer } from '../store/references';
import { createAutomaticVariant, variantLabel } from '../variants/automatic';

interface Props {
	project: LogoProject;
	activeVariant: string;
	reference: ReferenceLayer | null;
	onClose: () => void;
}

function safeFileName(name: string): string {
	return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'logo-project';
}

type TrimPreset = 'current' | 'business-mm' | 'business-in' | 'a4' | 'a5' | 'a6'
	| 'custom' | 'screen-square' | 'screen-portrait' | 'screen-landscape';

interface TrimSize {
	width: number;
	height: number;
	unit: PrintUnit;
}

const STANDARD_VARIANT_PAGES = ['primary', 'horizontal', 'vertical', 'icon-only', 'wordmark-only', 'black', 'white', 'monochrome'];

function trimSizeFor(
	preset: TrimPreset,
	project: LogoProject,
	customWidth: number,
	customHeight: number,
	customUnit: 'mm' | 'in',
): TrimSize {
	switch (preset) {
		case 'business-mm': return { width: 85, height: 55, unit: 'mm' };
		case 'business-in': return { width: 3.5, height: 2, unit: 'in' };
		case 'a4': return { width: 210, height: 297, unit: 'mm' };
		case 'a5': return { width: 148, height: 210, unit: 'mm' };
		case 'a6': return { width: 105, height: 148, unit: 'mm' };
		case 'screen-square': return { width: 1080, height: 1080, unit: 'px' };
		case 'screen-portrait': return { width: 1080, height: 1350, unit: 'px' };
		case 'screen-landscape': return { width: 1920, height: 1080, unit: 'px' };
		case 'custom': return { width: customWidth, height: customHeight, unit: customUnit };
		default: return { width: project.artboard.width, height: project.artboard.height, unit: 'px' };
	}
}

function printPageSizeLabel(size: TrimSize, preset: PrintPreset, bleedMm: number, marks: boolean): string {
	const bleed = preset === 'screen' ? 0 : preset === 'standard' ? 3 : bleedMm;
	const markMarginMm = marks && preset !== 'screen' ? 6 : 0;
	if (size.unit === 'px') {
		const width = size.width + 2 * (bleed + markMarginMm) * 72 / 25.4;
		const height = size.height + 2 * (bleed + markMarginMm) * 72 / 25.4;
		return `${width.toFixed(2)} × ${height.toFixed(2)} pt (1 px = 1 pt)`;
	}
	const extra = 2 * (bleed + markMarginMm) / (size.unit === 'in' ? 25.4 : 1);
	return `${(size.width + extra).toFixed(2)} × ${(size.height + extra).toFixed(2)} ${size.unit} final page`;
}

export default function ExportCenter({ project, activeVariant, reference, onClose }: Props) {
	const [outlineText, setOutlineText] = useState(true);
	const [pngTransparent, setPngTransparent] = useState(project.artboard.background === 'transparent');
	const [pngScale, setPngScale] = useState<RasterScale>(1);
	const [jpgScale, setJpgScale] = useState<RasterScale>(1);
	const [jpgBackground, setJpgBackground] = useState('#ffffff');
	const [jpgQuality, setJpgQuality] = useState(0.92);
	const [includeReference, setIncludeReference] = useState(false);
	const [trimPreset, setTrimPreset] = useState<TrimPreset>('current');
	const [customPrintWidth, setCustomPrintWidth] = useState(210);
	const [customPrintHeight, setCustomPrintHeight] = useState(297);
	const [customPrintUnit, setCustomPrintUnit] = useState<'mm' | 'in'>('mm');
	const [printPreset, setPrintPreset] = useState<PrintPreset>('screen');
	const [customBleedMm, setCustomBleedMm] = useState(3);
	const [printCropMarks, setPrintCropMarks] = useState(false);
	const [extendBackground, setExtendBackground] = useState(project.artboard.background !== 'transparent');
	const [includeVariantLabels, setIncludeVariantLabels] = useState(false);
	const [includePsdBackground, setIncludePsdBackground] = useState(false);
	const [simplifyForCanva, setSimplifyForCanva] = useState(false);
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [warnings, setWarnings] = useState<string[]>([]);
	const pngSize = useMemo(() => `${project.artboard.width * pngScale} × ${project.artboard.height * pngScale} px`, [project.artboard.height, project.artboard.width, pngScale]);
	const jpgSize = `${project.artboard.width * jpgScale} × ${project.artboard.height * jpgScale} px`;

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !busy) onClose();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [busy, onClose]);

	const runExport = async (label: string, action: () => Promise<{ warnings?: string[] }>) => {
		setBusy(label);
		setError('');
		setWarnings([]);
		try {
			const result = await action();
			if (result.warnings?.length) setWarnings(result.warnings);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : `${label} export failed.`);
		} finally {
			setBusy('');
		}
	};

	const activeProject: LogoProject = {
		...project,
		artboard: {
			...project.artboard,
			background: project.variantBackgrounds?.[activeVariant] ?? project.artboard.background,
		},
		variants: { primary: project.variants[activeVariant] ?? [] },
	};
	const createSvg = (background = activeProject.artboard.background) => (
		exportProjectToSvg(activeProject, { outlineText, background })
	);
	const exportSvg = () => runExport('SVG', async () => {
		const result = await createSvg();
		downloadBlob(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFileName(project.name)}.svg`);
		return result;
	});
	const exportPng = () => runExport('PNG', async () => {
		const background = pngTransparent
			? 'transparent'
			: activeProject.artboard.background === 'transparent' ? '#ffffff' : activeProject.artboard.background;
		const result = await createSvg(background);
		const raster = await renderSvgToRaster(result.svg, {
			width: project.artboard.width,
			height: project.artboard.height,
			format: 'png',
			scale: pngScale,
		});
		downloadBlob(raster.blob, `${safeFileName(project.name)}.png`);
		return result;
	});
	const exportJpg = () => runExport('JPG', async () => {
		const result = await createSvg('transparent');
		const raster = await renderSvgToRaster(result.svg, {
			width: project.artboard.width,
			height: project.artboard.height,
			format: 'jpg',
			scale: jpgScale,
			background: jpgBackground,
			quality: jpgQuality,
		});
		downloadBlob(raster.blob, `${safeFileName(project.name)}.jpg`);
		return result;
	});
	const exportPdf = () => runExport('PDF', async () => {
		const result = await exportProjectToSvg(activeProject, {
			outlineText: true,
			background: project.artboard.background,
		});
		const blob = await exportSvgToPdf(result.svg, activeProject.artboard.width, activeProject.artboard.height);
		downloadBlob(blob, `${safeFileName(project.name)}.pdf`);
		return result;
	});
	const exportPrintPdfFile = () => runExport('Print PDF', async () => {
		const trim = trimSizeFor(trimPreset, project, customPrintWidth, customPrintHeight, customPrintUnit);
		const result = await exportProjectToSvg(activeProject, { outlineText: true, background: 'transparent' });
		const pdf = await exportPrintPdf([{
			svg: result.svg,
			...trim,
			background: activeProject.artboard.background,
		}], {
			preset: printPreset,
			bleedMm: customBleedMm,
			cropMarks: printCropMarks,
			extendBackgroundColourIntoBleed: extendBackground,
		});
		downloadBlob(pdf.blob, `${safeFileName(project.name)}-print.pdf`);
		return result;
	});
	const exportVariantsSheet = () => runExport('Variants sheet', async () => {
		const pages: PrintPdfPage[] = [];
		const warnings = new Set<string>();
		for (const name of STANDARD_VARIANT_PAGES) {
			const generated = project.variants[name]
				? null
				: createAutomaticVariant(project, name, project.variantColors?.[name] ?? '#111111');
			const elements = project.variants[name] ?? generated?.elements ?? project.variants.primary ?? [];
			const background = project.variantBackgrounds?.[name] ?? generated?.background ?? project.artboard.background;
			const pageProject: LogoProject = {
				...project,
				artboard: { ...project.artboard, background },
				variants: { primary: elements },
			};
			if (includeVariantLabels) {
				const labelColor = background === '#202020' || name === 'white' ? '#ffffff' : '#303030';
				pageProject.variants.primary = [
					...elements,
					{
						id: `variant-label-${name}`,
						type: 'text',
						role: 'other',
						name: 'Variant label',
						x: 0,
						y: Math.max(0, project.artboard.height - 42),
						width: project.artboard.width,
						height: 36,
						rotation: 0,
						opacity: 1,
						locked: false,
						visible: true,
						text: variantLabel(name),
						fontFamily: 'Inter',
						fontSize: Math.max(12, Math.min(24, project.artboard.width / 24)),
						fontWeight: 600,
						align: 'center',
						fill: labelColor,
					},
				];
			}
			const vector = await exportProjectToSvg(pageProject, { outlineText: true, background: 'transparent' });
			vector.warnings.forEach((warning) => warnings.add(warning));
			pages.push({
				svg: vector.svg,
				width: project.artboard.width,
				height: project.artboard.height,
				unit: 'px' as const,
				background,
			});
		}
		const pdf = await exportPrintPdf(pages, { preset: 'screen' });
		downloadBlob(pdf.blob, `${safeFileName(project.name)}-variants.pdf`);
		return { warnings: [...warnings] };
	});
	const exportPsd = () => runExport('PSD', async () => {
		const { exportProjectToPsd } = await import('../export/psd');
		const bytes = await exportProjectToPsd(activeProject, { includeArtboardBackground: includePsdBackground });
		downloadBlob(new Blob([bytes], { type: 'image/vnd.adobe.photoshop' }), `${safeFileName(project.name)}.psd`);
		return {};
	});
	const exportCanva = () => runExport('Canva-ready', async () => {
		const { exportCanvaReadyZip } = await import('../export/canva');
		const result = await exportCanvaReadyZip(activeProject, simplifyForCanva);
		downloadBlob(result.blob, `${safeFileName(project.name)}-canva-ready.zip`);
		return { warnings: result.warnings };
	});
	const exportProjectFile = () => runExport('Project file', async () => {
		const file = includeReference
			? await createProjectFileWithReference(project, reference)
			: createProjectFile(project);
		downloadBlob(file, `${safeFileName(project.name)}.json`);
		return {};
	});
	const exportAllVariants = () => runExport('All variants', async () => {
		const variants = Object.entries(project.variants);
		if (!variants.length) throw new Error('There are no logo variants to export.');
		if (project.artboard.width * project.artboard.height > 16_000_000) {
			throw new Error('The artboard is too large to export every variant safely. Reduce the artboard dimensions and try again.');
		}
		const files: Record<string, Uint8Array> = {};
		const warnings = new Set<string>();
		const usedNames = new Set<string>();
		const readme = [
			`${project.name} — all logo variants`,
			'',
			'Each format folder contains every saved variant. Raster exports use 1× artboard size.',
			'SVG and PDF are vector exports where supported; PNG preserves transparency when enabled in Export Centre.',
			'JPG uses the selected Export Centre background colour.',
			'Reference images are never included in exports.',
			'',
		];

		for (const [variant, elements] of variants) {
			let slug = safeFileName(variant).toLowerCase().replace(/\s+/g, '-');
			if (usedNames.has(slug)) slug = `${slug}-${usedNames.size + 1}`;
			usedNames.add(slug);
			const background = project.variantBackgrounds?.[variant] ?? project.artboard.background;
			const variantProject: LogoProject = {
				...project,
				artboard: { ...project.artboard, background },
				variants: { primary: elements },
			};
			const vector = await exportProjectToSvg(variantProject, { outlineText, background });
			vector.warnings.forEach((warning) => warnings.add(warning));
			const fileBase = `${safeFileName(project.name)}-${slug}`;
			files[`SVG/${fileBase}.svg`] = strToU8(vector.svg);
			const pngBackground = pngTransparent ? 'transparent' : background === 'transparent' ? '#ffffff' : background;
			const pngVector = await exportProjectToSvg(variantProject, { outlineText, background: pngBackground });
			const png = await renderSvgToRaster(pngVector.svg, {
				width: project.artboard.width,
				height: project.artboard.height,
				format: 'png',
				scale: 1,
			});
			files[`PNG/${fileBase}.png`] = new Uint8Array(await png.blob.arrayBuffer());
			const jpgVector = await exportProjectToSvg(variantProject, { outlineText, background: 'transparent' });
			const jpg = await renderSvgToRaster(jpgVector.svg, {
				width: project.artboard.width,
				height: project.artboard.height,
				format: 'jpg',
				scale: 1,
				background: jpgBackground,
				quality: jpgQuality,
			});
			files[`JPG/${fileBase}.jpg`] = new Uint8Array(await jpg.blob.arrayBuffer());
			const pdfVector = await exportProjectToSvg(variantProject, { outlineText: true, background });
			const pdf = await exportSvgToPdf(pdfVector.svg, project.artboard.width, project.artboard.height);
			files[`PDF/${fileBase}.pdf`] = new Uint8Array(await pdf.arrayBuffer());
			readme.push(`${variant}: SVG/${fileBase}.svg, PNG/${fileBase}.png, JPG/${fileBase}.jpg, PDF/${fileBase}.pdf`);
			pngVector.warnings.forEach((warning) => warnings.add(warning));
			jpgVector.warnings.forEach((warning) => warnings.add(warning));
			pdfVector.warnings.forEach((warning) => warnings.add(warning));
		}
		files['README.txt'] = strToU8(readme.join('\n'));
		const archive = zipSync(files, { level: 6 });
		downloadBlob(new Blob([new Uint8Array(archive)], { type: 'application/zip' }), `${safeFileName(project.name)}-all-variants.zip`);
		return { warnings: Array.from(warnings) };
	});
	const trim = trimSizeFor(trimPreset, project, customPrintWidth, customPrintHeight, customPrintUnit);
	const effectiveCropMarks = printPreset === 'standard' || (printPreset === 'custom' && printCropMarks);
	const printSize = printPageSizeLabel(trim, printPreset, customBleedMm, effectiveCropMarks);

	return (
		<div
			className="logo-export-overlay"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !busy) onClose();
			}}
		>
			<section className="logo-export-dialog" role="dialog" aria-modal="true" aria-labelledby="logo-export-title">
				<header className="logo-export-header">
					<div>
						<p className="eyebrow">DOWNLOAD YOUR DESIGN</p>
						<h2 id="logo-export-title">Export Centre</h2>
						<p>Files are created locally. Layers, Lucide icons, shapes, gradients, and effects are included in supported formats.</p>
					</div>
					<button type="button" className="logo-export-close" autoFocus onClick={onClose} aria-label="Close Export Centre">×</button>
				</header>

				<div className="logo-export-options">
					<section className="logo-export-format">
						<div><h3>SVG</h3><p>Scalable vectors with gradients, shadows, and Lucide paths.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={outlineText} onChange={(event) => setOutlineText(event.target.checked)} /> Convert text to outlines</label>
						<p className="logo-export-size">Curved text is outlined even when this option is off.</p>
						<button type="button" onClick={() => void exportSvg()} disabled={Boolean(busy)}>{busy === 'SVG' ? 'Preparing…' : 'Download SVG'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>PNG</h3><p>Local raster render of your full design, with a transparent background option.</p></div>
						<label className="logo-phase-field"><span>Scale</span><select value={pngScale} onChange={(event) => setPngScale(Number(event.target.value) as RasterScale)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
						<label className="logo-export-check"><input type="checkbox" checked={pngTransparent} onChange={(event) => setPngTransparent(event.target.checked)} /> Transparent background</label>
						<p className="logo-export-size">Output: {pngSize}</p>
						<button type="button" onClick={() => void exportPng()} disabled={Boolean(busy)}>{busy === 'PNG' ? 'Preparing…' : 'Download PNG'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>JPG</h3><p>Local raster render of the full design, always filled with your selected background.</p></div>
						<div className="logo-export-control-row">
							<label className="logo-phase-field"><span>Scale</span><select value={jpgScale} onChange={(event) => setJpgScale(Number(event.target.value) as RasterScale)}><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
							<label className="logo-phase-field"><span>Background</span><input type="color" value={jpgBackground} onChange={(event) => setJpgBackground(event.target.value)} /></label>
							<label className="logo-phase-field logo-export-quality"><span>Quality: {Math.round(jpgQuality * 100)}%</span><input type="range" min="0.1" max="1" step="0.05" value={jpgQuality} onChange={(event) => setJpgQuality(Number(event.target.value))} /></label>
						</div>
						<p className="logo-export-size">Output: {jpgSize}</p>
						<button type="button" onClick={() => void exportJpg()} disabled={Boolean(busy)}>{busy === 'JPG' ? 'Preparing…' : 'Download JPG'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>PDF</h3><p>Artboard-sized PDF with outlined text. Designs with shadows use a raster fallback so effects remain visible.</p></div>
						<button type="button" onClick={() => void exportPdf()} disabled={Boolean(busy)}>{busy === 'PDF' ? 'Preparing…' : 'Download PDF'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>Print PDF</h3><p>Vector PDF with outlined text, print trim options, and optional bleed and crop marks.</p></div>
						<label className="logo-phase-field"><span>Trim size</span><select value={trimPreset} onChange={(event) => setTrimPreset(event.target.value as TrimPreset)}>
							<option value="current">Current artboard (px)</option>
							<option value="business-mm">Business card — 85 × 55 mm</option>
							<option value="business-in">Business card — 3.5 × 2 in</option>
							<option value="a4">A4 — 210 × 297 mm</option>
							<option value="a5">A5 — 148 × 210 mm</option>
							<option value="a6">A6 — 105 × 148 mm</option>
							<option value="custom">Custom dimensions</option>
							<option value="screen-square">Screen — 1080 × 1080 px</option>
							<option value="screen-portrait">Screen — 1080 × 1350 px</option>
							<option value="screen-landscape">Screen — 1920 × 1080 px</option>
						</select></label>
						{trimPreset === 'custom' && <div className="logo-export-control-row">
							<label className="logo-phase-field"><span>Width</span><input type="number" min="0.1" step="0.1" value={customPrintWidth} onChange={(event) => setCustomPrintWidth(Number(event.target.value))} /></label>
							<label className="logo-phase-field"><span>Height</span><input type="number" min="0.1" step="0.1" value={customPrintHeight} onChange={(event) => setCustomPrintHeight(Number(event.target.value))} /></label>
							<label className="logo-phase-field"><span>Unit</span><select value={customPrintUnit} onChange={(event) => setCustomPrintUnit(event.target.value as 'mm' | 'in')}><option value="mm">mm</option><option value="in">in</option></select></label>
						</div>}
						<div className="logo-export-control-row">
							<label className="logo-phase-field"><span>Print preset</span><select value={printPreset} onChange={(event) => setPrintPreset(event.target.value as PrintPreset)}>
								<option value="screen">Screen — no bleed or marks</option>
								<option value="standard">Standard print — 3 mm bleed + marks</option>
								<option value="custom">Custom</option>
							</select></label>
							{printPreset === 'custom' && <>
								<label className="logo-phase-field"><span>Bleed (0–10 mm)</span><input type="number" min="0" max="10" step="0.1" value={customBleedMm} onChange={(event) => setCustomBleedMm(Number(event.target.value))} /></label>
								<label className="logo-export-check"><input type="checkbox" checked={printCropMarks} onChange={(event) => setPrintCropMarks(event.target.checked)} /> Crop marks</label>
							</>}
						</div>
						<label className="logo-export-check"><input type="checkbox" checked={extendBackground} disabled={activeProject.artboard.background === 'transparent'} onChange={(event) => setExtendBackground(event.target.checked)} /> Extend background colour into the bleed</label>
						<p className="logo-export-size">Final PDF page: {printSize}. Screen pixel pages use 1 px = 1 pt to preserve exact aspect ratio.</p>
						<p className="logo-export-size">RGB PDF; your printer can convert it to CMYK.</p>
						<button type="button" onClick={() => void exportPrintPdfFile()} disabled={Boolean(busy) || !Number.isFinite(trim.width) || trim.width <= 0 || !Number.isFinite(trim.height) || trim.height <= 0 || (printPreset === 'custom' && (!Number.isFinite(customBleedMm) || customBleedMm < 0 || customBleedMm > 10))}>{busy === 'Print PDF' ? 'Preparing…' : 'Download Print PDF'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>Variants sheet PDF</h3><p>One outlined page for Primary, Horizontal, Vertical, Icon only, Wordmark only, Black, White, and Monochrome.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={includeVariantLabels} onChange={(event) => setIncludeVariantLabels(event.target.checked)} /> Add a label below each logo</label>
						<button type="button" onClick={() => void exportVariantsSheet()} disabled={Boolean(busy)}>{busy === 'Variants sheet' ? 'Preparing…' : 'Download variants sheet'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>Layered PSD</h3><p>Each element is an image layer; text is not live-editable. Raster layers are rendered at 2× and hidden layers remain hidden.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={includePsdBackground} onChange={(event) => setIncludePsdBackground(event.target.checked)} /> Include artboard background as its own layer</label>
						<p className="logo-export-size">The PSD stays transparent when this option is off. Export is capped at 64 million 2× layer pixels.</p>
						<button type="button" onClick={() => void exportPsd()} disabled={Boolean(busy)}>{busy === 'PSD' ? 'Preparing…' : 'Download Layered PSD'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>Canva-ready</h3><p>ZIP with outlined logo.svg, logo.pdf, and transparent 4× logo.png.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={simplifyForCanva} onChange={(event) => setSimplifyForCanva(event.target.checked)} /> Simplify for Canva</label>
						<p className="logo-export-size">Simplifying flattens the design into an embedded PNG and lists the changes. Canva’s import behaviour can change.</p>
						<button type="button" onClick={() => void exportCanva()} disabled={Boolean(busy)}>{busy === 'Canva-ready' ? 'Preparing ZIP…' : 'Download Canva-ready ZIP'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>Project file</h3><p>Save an editable JSON backup of this design.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={includeReference} disabled={!reference} onChange={(event) => setIncludeReference(event.target.checked)} /> Include the local reference image (off by default)</label>
						<button type="button" onClick={() => void exportProjectFile()} disabled={Boolean(busy)}>{busy === 'Project file' ? 'Preparing…' : 'Save project file'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>All variants</h3><p>Download every saved variant in SVG, PNG, JPG, and PDF folders, plus a README. References are excluded.</p></div>
						<button type="button" onClick={() => void exportAllVariants()} disabled={Boolean(busy)}>{busy === 'All variants' ? 'Preparing ZIP…' : 'Export all variants (ZIP)'}</button>
					</section>

				</div>

				{busy && <p className="logo-export-progress" role="status" aria-live="polite">Preparing {busy} locally…</p>}
				{error && <p className="logo-export-error" role="alert">{error}</p>}
				{warnings.length > 0 && <div className="logo-export-warning" role="status"><strong>Export notes:</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
			</section>
		</div>
	);
}
