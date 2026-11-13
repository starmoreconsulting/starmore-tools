import { useEffect, useMemo, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import { createProjectFile, createProjectFileWithReference } from '../export/project-file';
import { downloadBlob, renderSvgToRaster, type RasterScale } from '../export/raster';
import { exportSvgToPdf } from '../export/pdf';
import { exportProjectToSvg } from '../export/svg';
import type { LogoProject } from '../model/types';
import type { ReferenceLayer } from '../store/references';

interface Props {
	project: LogoProject;
	activeVariant: string;
	reference: ReferenceLayer | null;
	onClose: () => void;
}

function safeFileName(name: string): string {
	return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'logo-project';
}

export default function ExportCenter({ project, activeVariant, reference, onClose }: Props) {
	const [outlineText, setOutlineText] = useState(true);
	const [pngTransparent, setPngTransparent] = useState(project.artboard.background === 'transparent');
	const [pngScale, setPngScale] = useState<RasterScale>(1);
	const [jpgScale, setJpgScale] = useState<RasterScale>(1);
	const [jpgBackground, setJpgBackground] = useState('#ffffff');
	const [jpgQuality, setJpgQuality] = useState(0.92);
	const [includeReference, setIncludeReference] = useState(false);
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
						<div><h3>Project file</h3><p>Save an editable JSON backup of this design.</p></div>
						<label className="logo-export-check"><input type="checkbox" checked={includeReference} disabled={!reference} onChange={(event) => setIncludeReference(event.target.checked)} /> Include the local reference image (off by default)</label>
						<button type="button" onClick={() => void exportProjectFile()} disabled={Boolean(busy)}>{busy === 'Project file' ? 'Preparing…' : 'Save project file'}</button>
					</section>

					<section className="logo-export-format">
						<div><h3>All variants</h3><p>Download every saved variant in SVG, PNG, JPG, and PDF folders, plus a README. References are excluded.</p></div>
						<button type="button" onClick={() => void exportAllVariants()} disabled={Boolean(busy)}>{busy === 'All variants' ? 'Preparing ZIP…' : 'Export all variants (ZIP)'}</button>
					</section>

					<section className="logo-export-format logo-export-coming-soon" aria-label="More formats coming soon">
						<button type="button" disabled>PSD — Coming soon</button>
						<button type="button" disabled>Canva-compatible — Coming soon</button>
					</section>
				</div>

				{busy && <p className="logo-export-progress" role="status" aria-live="polite">Preparing {busy} locally…</p>}
				{error && <p className="logo-export-error" role="alert">{error}</p>}
				{warnings.length > 0 && <div className="logo-export-warning" role="status"><strong>Export notes:</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
			</section>
		</div>
	);
}
