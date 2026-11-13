import { useEffect, useMemo, useRef, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import { exportSvgPagesToPdf } from '../export/pdf';
import { downloadBlob, renderSvgToRaster, type RasterScale } from '../export/raster';
import type { Element, LogoProject } from '../model/types';
import { createSceneColors, renderMockupSvg, type MockupColors } from './render';
import { mockupCategories, mockupScenes, type MockupCategory, type MockupScene } from './scenes';
import './mockups.css';

const scenePreviewCache = new Map<string, { svg: string; notes: string[] }>();
const projectVariantRevisions = new WeakMap<object, number>();
let nextVariantRevision = 0;

function getVariantRevision(variants: LogoProject['variants']): number {
	let revision = projectVariantRevisions.get(variants);
	if (revision === undefined) {
		revision = ++nextVariantRevision;
		projectVariantRevisions.set(variants, revision);
	}
	return revision;
}

function cachePreview(key: string, value: { svg: string; notes: string[] }): void {
	scenePreviewCache.set(key, value);
	if (scenePreviewCache.size > 48) {
		const oldest = scenePreviewCache.keys().next().value;
		if (oldest) scenePreviewCache.delete(oldest);
	}
}

interface Props {
	project: LogoProject;
	initialSceneId?: string;
	onBack: () => void;
	onAddSample: () => void;
}

function useRenderedScene(
	scene: MockupScene,
	project: LogoProject,
	colors: MockupColors,
	variant: string,
	includeBackground: boolean,
	autoContrast: boolean,
	enabled: boolean,
) {
	const [svg, setSvg] = useState('');
	const [error, setError] = useState('');
	const [notes, setNotes] = useState<string[]>([]);
	const signature = `${scene.id}:${project.id}:${project.updatedAt}:${getVariantRevision(project.variants)}:${variant}:${includeBackground}:${autoContrast}:${JSON.stringify(colors)}`;
	useEffect(() => {
		if (!enabled) return undefined;
		let active = true;
		setSvg('');
		setError('');
		setNotes([]);
		const cached = scenePreviewCache.get(signature);
		if (cached) {
			setSvg(cached.svg);
			setNotes(cached.notes);
			return () => { active = false; };
		}
		void renderMockupSvg(scene, project, colors, { variant, includeBackground, autoContrast }).then((result) => {
			if (active) {
				setSvg(result.svg);
				const nextNotes = [
					...result.missingVariants.map((missing) => `The ${missing} variant is not available; showing the primary logo instead.`),
					...result.contrastWarnings,
				];
				setNotes(nextNotes);
				cachePreview(signature, { svg: result.svg, notes: nextNotes });
			}
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'This mockup could not be rendered.');
		});
		return () => { active = false; };
	}, [signature, enabled]);
	return { svg, error, notes };
}

function SceneImage({ scene, project, colors, variant, includeBackground, autoContrast = false, showNotes = false, lazy = false }: {
	scene: MockupScene;
	project: LogoProject;
	colors: MockupColors;
	variant: string;
	includeBackground: boolean;
	autoContrast?: boolean;
	showNotes?: boolean;
	lazy?: boolean;
}) {
	const [visible, setVisible] = useState(!lazy);
	const rootRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!lazy || visible) return undefined;
		const root = rootRef.current;
		if (!root || !('IntersectionObserver' in window)) {
			setVisible(true);
			return undefined;
		}
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				setVisible(true);
				observer.disconnect();
			}
		}, { rootMargin: '160px', threshold: 0.01 });
		observer.observe(root);
		return () => observer.disconnect();
	}, [lazy, visible]);
	const { svg, error, notes } = useRenderedScene(scene, project, colors, variant, includeBackground, autoContrast, !lazy || visible);
	if (error) return <div ref={rootRef} className="logo-mockup-image-error" role="alert">{error}</div>;
	if (!svg) return <div ref={rootRef} className="logo-mockup-image-loading" aria-label={visible ? 'Preparing mockup' : 'Mockup preview loads when visible'} />;
	return <div ref={rootRef} className="logo-mockup-preview-wrap">
		<div className="logo-mockup-svg" dangerouslySetInnerHTML={{ __html: svg }} />
		{showNotes && notes.map((note) => <p className="logo-mockup-note" role="status" key={note}>{note}</p>)}
	</div>;
}

function hasArtwork(project: LogoProject): boolean {
	const containsVisibleArtwork = (elements: Element[]): boolean => elements.some((element) => (
		element.visible && (element.type !== 'group' || containsVisibleArtwork(element.children ?? []))
	));
	return containsVisibleArtwork(project.variants.primary ?? []);
}

export default function MockupStudio({ project, initialSceneId, onBack, onAddSample }: Props) {
	const [category, setCategory] = useState<MockupCategory | 'All'>('All');
	const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
	const selectedScene = mockupScenes.find((scene) => scene.id === selectedSceneId) ?? null;
	const [colors, setColors] = useState<MockupColors>(() => createSceneColors(mockupScenes.find((scene) => scene.id === initialSceneId) ?? mockupScenes[0]));
	const [variant, setVariant] = useState('preferred');
	const [autoVariant, setAutoVariant] = useState(true);
	const [includeBackground, setIncludeBackground] = useState(true);
	const [presentationScenes, setPresentationScenes] = useState<Set<string>>(() => new Set(mockupScenes.map((scene) => scene.id)));
	const [rasterScale, setRasterScale] = useState<RasterScale>(1);
	const [busy, setBusy] = useState('');
	const [exportError, setExportError] = useState('');
	const scenes = useMemo(
		() => mockupScenes.filter((scene) => category === 'All' || scene.category === category),
		[category],
	);

	useEffect(() => {
		if (!initialSceneId) return;
		setSelectedSceneId(initialSceneId);
		const target = mockupScenes.find((scene) => scene.id === initialSceneId);
		if (target) setColors(createSceneColors(target));
	}, [initialSceneId]);

	useEffect(() => {
		if (!selectedScene) return;
		setColors(createSceneColors(selectedScene));
		setAutoVariant(true);
		setVariant('preferred');
		setIncludeBackground(true);
	}, [selectedSceneId]);

	const togglePresentation = (id: string) => {
		setPresentationScenes((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const activeVariant = autoVariant ? 'preferred' : variant;
	const availableVariants = Object.keys(project.variants);
	const empty = !hasArtwork(project);
	const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logo';
	const sceneDimensions = (scene: MockupScene) => {
		const [, , width, height] = scene.viewBox.trim().split(/\s+/).map(Number);
		return { width, height };
	};
	const renderScene = (scene: MockupScene) => renderMockupSvg(
		scene,
		project,
		scene.id === selectedScene?.id ? colors : createSceneColors(scene),
		{
			variant: scene.id === selectedScene?.id ? activeVariant : 'preferred',
			includeBackground: scene.id === selectedScene?.id ? includeBackground : true,
			autoContrast: scene.id === selectedScene?.id ? autoVariant : true,
		},
	);
	const exportAction = async (label: string, action: () => Promise<void>) => {
		setBusy(label);
		setExportError('');
		try {
			await action();
		} catch (cause) {
			setExportError(cause instanceof Error ? cause.message : `${label} could not be exported.`);
		} finally {
			setBusy('');
		}
	};
	const exportOne = (format: 'SVG' | 'PNG' | 'JPG') => exportAction(format, async () => {
		if (!selectedScene) throw new Error('Choose a mockup first.');
		const result = await renderScene(selectedScene);
		const fileBase = `${safeName(project.name)}-${selectedScene.id}`;
		if (format === 'SVG') {
			downloadBlob(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBase}.svg`);
			return;
		}
		const { width, height } = sceneDimensions(selectedScene);
		const raster = await renderSvgToRaster(result.svg, {
			width,
			height,
			format: format === 'PNG' ? 'png' : 'jpg',
			scale: rasterScale,
			background: format === 'JPG' && !includeBackground ? '#efeee9' : undefined,
		});
		downloadBlob(raster.blob, `${fileBase}.${format.toLowerCase()}`);
	});
	const exportAll = () => exportAction('All mockups', async () => {
		const files: Record<string, Uint8Array> = {};
		for (const scene of mockupScenes) {
			const result = await renderScene(scene);
			const { width, height } = sceneDimensions(scene);
			const name = `${safeName(project.name)}-${scene.id}`;
			files[`SVG/${name}.svg`] = strToU8(result.svg);
			const png = await renderSvgToRaster(result.svg, { width, height, format: 'png', scale: 1 });
			files[`PNG/${name}.png`] = new Uint8Array(await png.blob.arrayBuffer());
			const jpg = await renderSvgToRaster(result.svg, { width, height, format: 'jpg', scale: 1, background: '#ffffff', quality: 0.92 });
			files[`JPG/${name}.jpg`] = new Uint8Array(await jpg.blob.arrayBuffer());
		}
		files['README.txt'] = strToU8('Logo mockups created locally by Starmore Tools.\nEach SVG, PNG, and JPG is a separate scene preview. All artwork remains on your device.');
		const archive = zipSync(files, { level: 5 });
		downloadBlob(new Blob([new Uint8Array(archive)], { type: 'application/zip' }), `${safeName(project.name)}-mockups.zip`);
	});
	const exportPresentation = () => exportAction('Brand presentation', async () => {
		const chosen = mockupScenes.filter((scene) => presentationScenes.has(scene.id));
		if (!chosen.length) throw new Error('Choose at least one scene for the brand presentation.');
		const pages = [];
		for (const scene of chosen) {
			const result = await renderScene(scene);
			const { width, height } = sceneDimensions(scene);
			pages.push({ svg: result.svg, width, height });
		}
		const blob = await exportSvgPagesToPdf(pages);
		downloadBlob(blob, `${safeName(project.name)}-brand-presentation.pdf`);
	});

	return (
		<section className="logo-mockup-studio" aria-label="Logo mockups">
			<header className="logo-mockup-header">
				<div>
					<p className="logo-mockup-eyebrow">SEE IT IN CONTEXT</p>
					<h2>Mockups</h2>
					<p>Preview your logo on stationery, packaging, apparel, and more. Everything is rendered locally.</p>
				</div>
				<button type="button" className="logo-mockup-back" onClick={onBack}>Back to editor</button>
			</header>

			{empty && <div className="logo-mockup-empty" role="status">
				<strong>Add a logo to preview it in these scenes.</strong>
				<span>Start with a simple editable wordmark, then return to mockups.</span>
				<button type="button" onClick={onAddSample}>Add a sample wordmark</button>
			</div>}

			{selectedScene ? (
				<section className="logo-mockup-detail" aria-label={`${selectedScene.name} preview`}>
					<div className="logo-mockup-detail-heading">
						<div>
							<button type="button" className="logo-mockup-text-button" onClick={() => setSelectedSceneId(null)}>← All mockups</button>
							<p className="logo-mockup-eyebrow">{selectedScene.category.toUpperCase()}</p>
							<h3>{selectedScene.name}</h3>
							<p>{selectedScene.description}</p>
						</div>
						<label className="logo-mockup-include">
							<input type="checkbox" checked={presentationScenes.has(selectedScene.id)} onChange={() => togglePresentation(selectedScene.id)} />
							Include in presentation
						</label>
					</div>
					<div className="logo-mockup-detail-grid">
						<div className="logo-mockup-stage">
							<SceneImage scene={selectedScene} project={project} colors={colors} variant={activeVariant} includeBackground={includeBackground} autoContrast={autoVariant} showNotes />
						</div>
						<aside className="logo-mockup-controls" aria-label="Mockup settings">
							<label className="logo-mockup-control">
								<span>Logo variant</span>
								<select value={autoVariant ? 'preferred' : variant} onChange={(event) => {
									const value = event.target.value;
									setAutoVariant(value === 'preferred');
									setVariant(value === 'preferred' ? 'primary' : value);
								}}>
									<option value="preferred">Recommended for each surface</option>
									{availableVariants.map((name) => <option key={name} value={name}>{name}</option>)}
								</select>
							</label>
							<label className="logo-mockup-check"><input type="checkbox" checked={autoVariant} onChange={(event) => {
								setAutoVariant(event.target.checked);
								if (!event.target.checked && variant === 'preferred') setVariant('primary');
							}} /> Use dark / light version automatically</label>
							<label className="logo-mockup-check"><input type="checkbox" checked={includeBackground} onChange={(event) => setIncludeBackground(event.target.checked)} /> Show scene background</label>
							<fieldset className="logo-mockup-color-fields">
								<legend>Scene colours</legend>
								{Object.entries(colors).map(([name, value]) => {
									const parameter = name as keyof MockupColors;
									const swatches = ['#fffefa', '#d8cbb5', '#718477', '#263d32', '#222222'];
									return <label key={name}>
										<span className="logo-mockup-color-name">{selectedScene.colors[parameter].name}
											<span className="logo-mockup-swatches" role="group" aria-label={`${selectedScene.colors[parameter].name} swatches`}>
												{swatches.map((swatch) => <button
													type="button"
													key={swatch}
													className={value.toLowerCase() === swatch ? 'is-selected' : ''}
													style={{ backgroundColor: swatch }}
													aria-label={`${selectedScene.colors[parameter].name} ${swatch} swatch`}
													aria-pressed={value.toLowerCase() === swatch}
													onClick={() => setColors((current) => ({ ...current, [parameter]: swatch }))}
												/>)}
											</span>
										</span>
										<input aria-label={`${selectedScene.colors[parameter].name} custom colour`} type="color" value={value} onChange={(event) => setColors((current) => ({ ...current, [parameter]: event.target.value }))} />
									</label>;
								})}
							</fieldset>
							<fieldset className="logo-mockup-exports">
								<legend>Download this mockup</legend>
								<label className="logo-mockup-control"><span>PNG / JPG scale</span>
									<select value={rasterScale} onChange={(event) => setRasterScale(Number(event.target.value) as RasterScale)}>
										<option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
									</select>
								</label>
								<div className="logo-mockup-export-buttons">
									<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('PNG')}>{busy === 'PNG' ? 'Preparing…' : 'PNG'}</button>
									<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('JPG')}>{busy === 'JPG' ? 'Preparing…' : 'JPG'}</button>
									<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('SVG')}>{busy === 'SVG' ? 'Preparing…' : 'SVG'}</button>
								</div>
							</fieldset>
							<button type="button" className="logo-mockup-export-primary" disabled={Boolean(busy)} onClick={() => void exportAll()}>{busy === 'All mockups' ? 'Preparing ZIP…' : 'Download all mockups (ZIP)'}</button>
							<button type="button" className="logo-mockup-export-secondary" disabled={Boolean(busy)} onClick={() => void exportPresentation()}>{busy === 'Brand presentation' ? 'Preparing PDF…' : 'Download brand presentation (PDF)'}</button>
						</aside>
					</div>
				</section>
			) : (
				<>
					<nav className="logo-mockup-categories" aria-label="Mockup categories">
						<button type="button" aria-pressed={category === 'All'} onClick={() => setCategory('All')}>All scenes</button>
						{mockupCategories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
					</nav>
					<div className="logo-mockup-grid">
						{scenes.map((scene) => {
							const sceneColors = scene.id === selectedSceneId ? colors : createSceneColors(scene);
							return <article className="logo-mockup-card" key={scene.id}>
								<button type="button" className="logo-mockup-card-open" onClick={() => setSelectedSceneId(scene.id)} aria-label={`Open ${scene.name}`}>
									<div className="logo-mockup-card-image"><SceneImage scene={scene} project={project} colors={sceneColors} variant="preferred" includeBackground autoContrast lazy /></div>
									<span className="logo-mockup-card-category">{scene.category}</span>
									<strong>{scene.name}</strong>
									<span className="logo-mockup-card-description">{scene.description}</span>
								</button>
								<label className="logo-mockup-include"><input type="checkbox" checked={presentationScenes.has(scene.id)} onChange={() => togglePresentation(scene.id)} /> Include in presentation</label>
							</article>;
						})}
					</div>
				</>
			)}
			{busy && <p className="logo-mockup-export-status" role="status" aria-live="polite">Creating {busy} locally…</p>}
			{exportError && <p className="logo-mockup-export-error" role="alert">{exportError}</p>}
		</section>
	);
}
