import { useEffect, useMemo, useState } from 'react';
import { createProjectFile } from '../export/project-file';
import { downloadBlob, renderSvgToRaster, type RasterScale } from '../export/raster';
import { exportSvgToPdf } from '../export/pdf';
import { exportProjectToSvg } from '../export/svg';
import type { LogoProject } from '../model/types';

interface Props {
	project: LogoProject;
	activeVariant: string;
	onClose: () => void;
}

function safeFileName(name: string): string {
	return name.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'logo-project';
}

export default function ExportCenter({ project, activeVariant, onClose }: Props) {
	const [outlineText, setOutlineText] = useState(true);
	const [pngTransparent, setPngTransparent] = useState(project.artboard.background === 'transparent');
	const [pngScale, setPngScale] = useState<RasterScale>(1);
	const [jpgScale, setJpgScale] = useState<RasterScale>(1);
	const [jpgBackground, setJpgBackground] = useState('#ffffff');
	const [jpgQuality, setJpgQuality] = useState(0.92);
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
		downloadBlob(createProjectFile(project), `${safeFileName(project.name)}.json`);
		return {};
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
						<button type="button" onClick={() => void exportProjectFile()} disabled={Boolean(busy)}>{busy === 'Project file' ? 'Preparing…' : 'Save project file'}</button>
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
