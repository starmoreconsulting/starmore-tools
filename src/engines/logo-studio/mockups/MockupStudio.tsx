import { useEffect, useMemo, useState } from 'react';
import type { LogoProject } from '../model/types';
import { createSceneColors, renderMockupSvg, type MockupColors } from './render';
import { mockupCategories, mockupScenes, type MockupCategory, type MockupScene } from './scenes';
import './mockups.css';

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
) {
	const [svg, setSvg] = useState('');
	const [error, setError] = useState('');
	const signature = `${scene.id}:${project.id}:${project.updatedAt}:${variant}:${includeBackground}:${JSON.stringify(colors)}:${JSON.stringify(project.variants)}`;
	useEffect(() => {
		let active = true;
		setSvg('');
		setError('');
		void renderMockupSvg(scene, project, colors, { variant, includeBackground }).then((result) => {
			if (active) setSvg(result.svg);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'This mockup could not be rendered.');
		});
		return () => { active = false; };
	}, [signature]);
	return { svg, error };
}

function SceneImage({ scene, project, colors, variant, includeBackground }: {
	scene: MockupScene;
	project: LogoProject;
	colors: MockupColors;
	variant: string;
	includeBackground: boolean;
}) {
	const { svg, error } = useRenderedScene(scene, project, colors, variant, includeBackground);
	if (error) return <div className="logo-mockup-image-error" role="alert">{error}</div>;
	if (!svg) return <div className="logo-mockup-image-loading" aria-label="Preparing mockup" />;
	return <div className="logo-mockup-svg" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function hasArtwork(project: LogoProject): boolean {
	return (project.variants.primary ?? []).some((element) => element.visible);
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
							<SceneImage scene={selectedScene} project={project} colors={colors} variant={activeVariant} includeBackground={includeBackground} />
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
							<label className="logo-mockup-check"><input type="checkbox" checked={autoVariant} onChange={(event) => setAutoVariant(event.target.checked)} /> Use dark / light version automatically</label>
							<label className="logo-mockup-check"><input type="checkbox" checked={includeBackground} onChange={(event) => setIncludeBackground(event.target.checked)} /> Show scene background</label>
							<fieldset className="logo-mockup-color-fields">
								<legend>Scene colours</legend>
								{Object.entries(colors).map(([name, value]) => {
									const parameter = name as keyof MockupColors;
									return <label key={name}>
										<span>{selectedScene.colors[parameter].name}</span>
										<input aria-label={`${selectedScene.colors[parameter].name} colour`} type="color" value={value} onChange={(event) => setColors((current) => ({ ...current, [parameter]: event.target.value }))} />
									</label>;
								})}
							</fieldset>
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
									<div className="logo-mockup-card-image"><SceneImage scene={scene} project={project} colors={sceneColors} variant="preferred" includeBackground /></div>
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
		</section>
	);
}
