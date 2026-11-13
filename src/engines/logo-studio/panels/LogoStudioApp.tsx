import { useEffect, useMemo, useRef, useState } from 'react';
import SvgArtboard from '../canvas/SvgArtboard';
import { createDefaultElement, createDefaultProject, type Element, type LogoBrief, type LogoStudioPreset } from '../model/types';
import { useLogoStudioStore } from '../store/store';
import ElementProperties from './ElementProperties';
import ElementSidebar from './ElementSidebar';
import PhaseOneToolbar from './PhaseOneToolbar';
import { loadBrowserFont } from '../library/fonts';
import { readProjectFileWithReference } from '../export/project-file';
import MyProjects from './MyProjects';
import ExportCenter from './ExportCenter';
import SetupFlow from './SetupFlow';
import GalleryScreen from './GalleryScreen';
import { seedForBrief, type LogoDesign } from '../templates/generator';
import { restoreLastProject, saveLocalProject, setLastProjectId } from '../store/local-projects';
import VariantBar from './VariantBar';
import CompareVariants from './CompareVariants';
import { primarySignature } from '../variants/automatic';
import { createReferenceFromFile, deleteLocalReference, loadLocalReference, saveLocalReference, type ReferenceLayer } from '../store/references';
import { importCustomSvgIcon, importSvg } from '../import/svg-import';
import MockupStudio from '../mockups/MockupStudio';
import './phase-one.css';

type MobilePanel = 'elements' | 'properties';

function presetBrief(preset: LogoStudioPreset): LogoBrief {
	const defaults: LogoBrief = {
		businessName: '',
		tagline: '',
		industry: 'General',
		description: '',
		style: 'Modern',
		preferredPalette: 'Blue and silver',
		arrangement: 'icon-above-text',
	};
	const presets: Record<LogoStudioPreset, Partial<LogoBrief>> = {
		text: { style: 'Minimalist', arrangement: 'text-only' },
		monogram: { style: 'Elegant', arrangement: 'badge' },
		template: { style: 'Modern', arrangement: 'icon-above-text' },
		'business-name': { industry: 'Business', style: 'Corporate', arrangement: 'text-only' },
		industry: { industry: 'Technology', style: 'Modern', arrangement: 'icon-above-text' },
		icon: { style: 'Geometric', arrangement: 'icon-above-text' },
		initials: { style: 'Elegant', arrangement: 'badge' },
		variation: { style: 'Modern', arrangement: 'icon-above-text' },
		'black-and-white': { style: 'Minimalist', preferredPalette: 'Black and white', arrangement: 'text-only' },
		'colour-variation': { style: 'Modern', preferredPalette: 'Pastels', arrangement: 'icon-above-text' },
		reference: { style: 'Modern', arrangement: 'icon-above-text' },
		redesign: { style: 'Vintage', arrangement: 'icon-above-text' },
		mockups: { style: 'Modern' },
		'business-card-mockup': { style: 'Corporate', arrangement: 'icon-left' },
		'tshirt-mockup': { style: 'Bold' },
		'preview-mockup': { style: 'Modern' },
		'export-centre': { style: 'Modern' },
	};
	return { ...defaults, ...presets[preset] };
}

function findElement(elements: Element[], id: string | null): Element | null {
	if (!id) return null;
	for (const element of elements) {
		if (element.id === id) return element;
		const child = element.children && findElement(element.children, id);
		if (child) return child;
	}
	return null;
}

function findTextElements(elements: Element[]): Element[] {
	return elements.flatMap((element) => [
		...(element.type === 'text' ? [element] : []),
		...(element.children ? findTextElements(element.children) : []),
	]);
}

export default function LogoStudioApp({ preset }: { preset?: LogoStudioPreset } = {}) {
	const uploadPreset = preset === 'reference' || preset === 'redesign';
	const mockupPreset = preset === 'mockups' || preset === 'business-card-mockup' || preset === 'tshirt-mockup' || preset === 'preview-mockup';
	const initialMockupScene = preset === 'business-card-mockup'
		? 'business-cards-stack'
		: preset === 'tshirt-mockup' ? 'tshirt-light' : undefined;
	const project = useLogoStudioStore((state) => state.project);
	const activeVariant = useLogoStudioStore((state) => state.activeVariant);
	const selectedId = useLogoStudioStore((state) => state.selectedId);
	const selectedIds = useLogoStudioStore((state) => state.selectedIds);
	const pastCount = useLogoStudioStore((state) => state.past.length);
	const futureCount = useLogoStudioStore((state) => state.future.length);
	const select = useLogoStudioStore((state) => state.select);
	const updateElement = useLogoStudioStore((state) => state.updateElement);
	const addElement = useLogoStudioStore((state) => state.addElement);
	const addElements = useLogoStudioStore((state) => state.addElements);
	const removeSelected = useLogoStudioStore((state) => state.removeSelected);
	const duplicateSelected = useLogoStudioStore((state) => state.duplicateSelected);
	const copySelected = useLogoStudioStore((state) => state.copySelected);
	const paste = useLogoStudioStore((state) => state.paste);
	const setBackground = useLogoStudioStore((state) => state.setBackground);
	const reorderElement = useLogoStudioStore((state) => state.reorderElement);
	const groupSelected = useLogoStudioStore((state) => state.groupSelected);
	const ungroupSelected = useLogoStudioStore((state) => state.ungroupSelected);
	const alignSelected = useLogoStudioStore((state) => state.alignSelected);
	const distributeSelected = useLogoStudioStore((state) => state.distributeSelected);
	const undo = useLogoStudioStore((state) => state.undo);
	const redo = useLogoStudioStore((state) => state.redo);
	const loadProject = useLogoStudioStore((state) => state.loadProject);
	const setActiveVariant = useLogoStudioStore((state) => state.setActiveVariant);
	const createFromPrimary = useLogoStudioStore((state) => state.createFromPrimary);
	const duplicateCurrentVariant = useLogoStudioStore((state) => state.duplicateCurrentVariant);
	const resetCurrentVariant = useLogoStudioStore((state) => state.resetCurrentVariant);
	const rebuildVariant = useLogoStudioStore((state) => state.rebuildVariant);
	const [zoom, setZoom] = useState(100);
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>('elements');
	const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
	const [status, setStatus] = useState(uploadPreset
		? 'Import an SVG or add a local reference image to start your redesign.'
		: 'Your design stays on this device.');
	const [fileError, setFileError] = useState('');
	const [storageReady, setStorageReady] = useState(false);
	const [showProjects, setShowProjects] = useState(false);
	const [showExportCenter, setShowExportCenter] = useState(false);
	const [showSetup, setShowSetup] = useState(Boolean(preset && !uploadPreset && !mockupPreset && preset !== 'export-centre'));
	const [showGallery, setShowGallery] = useState(false);
	const [showMockups, setShowMockups] = useState(mockupPreset);
	const [showVariantComparison, setShowVariantComparison] = useState(false);
	const [reference, setReference] = useState<ReferenceLayer | null>(null);
	const [referenceReady, setReferenceReady] = useState(false);
	const [galleryBrief, setGalleryBrief] = useState<LogoBrief | null>(null);
	const [gallerySeed, setGallerySeed] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const referenceInputRef = useRef<HTMLInputElement>(null);
	const svgInputRef = useRef<HTMLInputElement>(null);
	const iconInputRef = useRef<HTMLInputElement>(null);
	const elements = project.variants[activeVariant] ?? [];
	const primaryElements = project.variants.primary ?? [];
	const primaryChanged = activeVariant !== 'primary'
		&& project.variantSources?.[activeVariant] !== primarySignature(primaryElements, project.artboard.background);
	const monochromeColor = project.variantColors?.monochrome ?? '#111111';
	const selectedElement = useMemo(() => findElement(elements, selectedId), [elements, selectedId]);
	const addText = () => addElement(createDefaultElement('text', { x: 90, y: 268, width: 420, height: 64 }));
	const openProjectFile = async (file: File | undefined) => {
		if (!file) return;
		try {
			const imported = await readProjectFileWithReference(file);
			loadProject(imported.project);
			await saveLocalProject(imported.project);
			await deleteLocalReference(imported.project.id);
			if (imported.reference) await saveLocalReference(imported.project.id, imported.reference);
			setReference(imported.reference);
			setReferenceReady(true);
			setStatus(`Opened “${imported.project.name}”.`);
			setFileError('');
			setShowProjects(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'The project file could not be opened.';
			setFileError(message);
			setStatus(message);
		}
	};
	const openReferenceFile = async (file: File | undefined) => {
		if (!file) return;
		try {
			const prepared = await createReferenceFromFile(file, project.artboard.width, project.artboard.height);
			await saveLocalReference(project.id, prepared);
			setReference(prepared);
			setReferenceReady(true);
			setFileError('');
			setStatus(`Reference “${prepared.name}” is stored on this device only.`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'The reference image could not be opened.';
			setFileError(message);
			setStatus(message);
		}
	};
	const openSvgImport = async (file: File | undefined, asIcon: boolean) => {
		if (!file) return;
		try {
			if (file.size > 10 * 1024 * 1024) throw new Error('SVG files must be 10 MB or smaller.');
			if (file.type !== 'image/svg+xml' && !file.name.toLowerCase().endsWith('.svg')) {
				throw new Error('Choose a valid SVG file.');
			}
			const contents = await file.text();
			const result = asIcon
				? importCustomSvgIcon(contents, project.artboard.width, project.artboard.height)
				: importSvg(contents, project.artboard.width, project.artboard.height);
			addElements(result.elements);
			const summary = asIcon
				? `Imported ${result.imported} shapes as one custom icon group`
				: `Imported ${result.imported} shapes`;
			setStatus(`${summary}${result.skipped ? `, skipped ${result.skipped} unsupported items` : ''}${result.limitReason ? `. ${result.limitReason} reached` : ''}.`);
			setFileError('');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'The SVG could not be imported.';
			setFileError(message);
			setStatus(message);
		}
	};
	const updateReference = (patch: Partial<ReferenceLayer>) => {
		if (!reference) return;
		const updated = { ...reference, ...patch };
		setReference(updated);
		void saveLocalReference(project.id, updated).catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'The reference image could not be saved locally.';
			setStatus(`Reference save failed: ${message}`);
		});
	};
	const removeReference = () => {
		setReference(null);
		void deleteLocalReference(project.id).then(() => {
			setStatus('Reference removed. Your logo is unchanged.');
		}).catch((error: unknown) => {
			const message = error instanceof Error ? error.message : 'The reference image could not be removed.';
			setStatus(`Reference removal failed: ${message}`);
		});
	};

	useEffect(() => {
		let active = true;
		setReference(null);
		setReferenceReady(false);
		void loadLocalReference(project.id).then((saved) => {
			if (!active) return;
			setReference(saved);
			setReferenceReady(true);
		}).catch((error: unknown) => {
			if (!active) return;
			const message = error instanceof Error ? error.message : 'The local reference image could not be loaded.';
			setStatus(`Reference restore failed: ${message}`);
			setReferenceReady(true);
		});
		return () => { active = false; };
	}, [project.id]);

	useEffect(() => {
		let active = true;
		void restoreLastProject().then((restored) => {
			if (!active) return;
			if (restored) {
				loadProject(restored);
				setStatus(`Restored “${restored.name}” from this device.`);
			}
			setStorageReady(true);
		}).catch((error: unknown) => {
			if (!active) return;
			const message = error instanceof Error ? error.message : 'Local projects could not be restored.';
			setStatus(`Local project storage is unavailable: ${message}`);
			setStorageReady(true);
		});
		return () => { active = false; };
	}, [loadProject]);

	useEffect(() => {
		if (storageReady && preset === 'export-centre') setShowExportCenter(true);
	}, [preset, storageReady]);

	useEffect(() => {
		if (!storageReady) return undefined;
		let active = true;
		let timer: number | undefined;
		let saveQueue = Promise.resolve();
		const scheduleSave = (nextProject: typeof project) => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				saveQueue = saveQueue.then(() => saveLocalProject(nextProject)).then(() => {
					if (active) setStatus('Autosaved on this device.');
				}).catch((error: unknown) => {
					if (!active) return;
					const message = error instanceof Error ? error.message : 'The project could not be saved locally.';
					setStatus(`Autosave failed: ${message}`);
				});
			}, 600);
		};
		scheduleSave(project);
		const unsubscribe = useLogoStudioStore.subscribe((state, previous) => {
			if (state.project !== previous.project) scheduleSave(state.project);
		});
		return () => {
			active = false;
			window.clearTimeout(timer);
			unsubscribe();
		};
	}, [storageReady]);

	useEffect(() => {
		const texts = findTextElements(elements);
		const fontRequests = new Map(texts.map((element) => [
			`${element.fontFamily ?? 'Inter'}:${element.fontWeight ?? 400}`,
			{ family: element.fontFamily ?? 'Inter', weight: element.fontWeight ?? 400 },
		]));
		void Promise.allSettled(Array.from(fontRequests.values(), ({ family, weight }) => loadBrowserFont(family, weight)))
			.then((results) => {
				const failed = results.filter((result) => result.status === 'rejected').length;
				if (failed) setStatus(`${failed} local font${failed === 1 ? '' : 's'} could not load. The browser fallback font is being used.`);
			});
	}, [elements, setStatus]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			if (target instanceof HTMLElement && (
				target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
			)) return;

			const key = event.key.toLowerCase();
			if (event.ctrlKey || event.metaKey) {
				if (key === 'z') {
					event.preventDefault();
					if (event.shiftKey) redo();
					else undo();
				} else if (key === 'y') {
					event.preventDefault();
					redo();
				} else if (key === 'c' && selectedId) {
					event.preventDefault();
					copySelected();
				} else if (key === 'v') {
					event.preventDefault();
					paste();
				} else if (key === 'd' && selectedId) {
					event.preventDefault();
					duplicateSelected();
				}
				return;
			}

			if ((key === 'delete' || key === 'backspace') && selectedElement && !selectedElement.locked) {
				event.preventDefault();
				removeSelected();
				return;
			}

			if (!selectedId || !selectedElement || selectedElement.locked) return;
			const step = event.shiftKey ? 10 : 1;
			const offsets: Record<string, { x: number; y: number }> = {
				arrowleft: { x: -step, y: 0 },
				arrowright: { x: step, y: 0 },
				arrowup: { x: 0, y: -step },
				arrowdown: { x: 0, y: step },
			};
			const offset = offsets[key];
			if (!offset) return;
			event.preventDefault();
			updateElement(selectedId, {
				x: selectedElement.x + offset.x,
				y: selectedElement.y + offset.y,
			});
		};

		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [copySelected, duplicateSelected, paste, project, redo, removeSelected, selectedElement, selectedId, undo, updateElement]);

	const propertiesPanel = <ElementProperties
		element={selectedElement}
		onUpdate={(patch) => {
			if (selectedId) updateElement(selectedId, patch);
		}}
	/>;
	const elementLibrary = <ElementSidebar
		onAdd={addElement}
		onImportSvg={() => svgInputRef.current?.click()}
		onImportIcon={() => iconInputRef.current?.click()}
		element={selectedElement}
		elements={elements}
		selectedIds={selectedIds}
		onSelect={select}
		onLayerUpdate={updateElement}
		onReorder={reorderElement}
		onGroup={groupSelected}
		onUngroup={ungroupSelected}
		artboardWidth={project.artboard.width}
		artboardHeight={project.artboard.height}
		onAlign={(alignment, toArtboard) => alignSelected(alignment, toArtboard, project.artboard.width, project.artboard.height)}
		onDistribute={distributeSelected}
		onUpdate={(patch) => {
			if (selectedId) updateElement(selectedId, patch);
		}}
	/>;

	return (
		<section className="logo-phase-app" aria-label="Logo Studio editor">
			<PhaseOneToolbar
				canUndo={pastCount > 0}
				canRedo={futureCount > 0}
				zoom={zoom}
				onUndo={undo}
				onRedo={redo}
				onZoomChange={setZoom}
				onOpenProject={() => fileInputRef.current?.click()}
				onReference={() => referenceInputRef.current?.click()}
				onNewLogo={() => setShowSetup(true)}
				onMockups={() => setShowMockups(true)}
				onProjects={() => setShowProjects(true)}
				onExport={() => setShowExportCenter(true)}
			/>
			{showSetup && <SetupFlow
				initialBrief={galleryBrief ?? (preset ? presetBrief(preset) : undefined)}
				onSkip={() => {
					loadProject(createDefaultProject());
					setShowSetup(false);
					setShowProjects(false);
				}}
				onComplete={(brief: LogoBrief) => {
					setGalleryBrief(brief);
					setGallerySeed(seedForBrief(brief));
					setShowGallery(true);
					setShowSetup(false);
				}}
			/>}
			<input
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				className="visually-hidden"
				aria-label="Open Logo Studio project file"
				onChange={(event) => {
					void openProjectFile(event.currentTarget.files?.[0]);
					event.currentTarget.value = '';
				}}
			/>
			<input
				ref={referenceInputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
				className="visually-hidden"
				aria-label="Upload reference image"
				onChange={(event) => {
					void openReferenceFile(event.currentTarget.files?.[0]);
					event.currentTarget.value = '';
				}}
			/>
			<input
				ref={svgInputRef}
				type="file"
				accept="image/svg+xml,.svg"
				className="visually-hidden"
				aria-label="Import SVG"
				onChange={(event) => {
					void openSvgImport(event.currentTarget.files?.[0], false);
					event.currentTarget.value = '';
				}}
			/>
			<input
				ref={iconInputRef}
				type="file"
				accept="image/svg+xml,.svg"
				className="visually-hidden"
				aria-label="Upload custom icon SVG"
				onChange={(event) => {
					void openSvgImport(event.currentTarget.files?.[0], true);
					event.currentTarget.value = '';
				}}
			/>
			{showExportCenter && <ExportCenter project={project} activeVariant={activeVariant} reference={referenceReady ? reference : null} onClose={() => setShowExportCenter(false)} />}
			{showVariantComparison && <CompareVariants project={project} onClose={() => setShowVariantComparison(false)} />}
			{showGallery && galleryBrief ? (
				<GalleryScreen
					brief={galleryBrief}
					seed={gallerySeed}
					onSeedChange={setGallerySeed}
					onBack={() => {
						setShowGallery(false);
						setShowSetup(true);
					}}
					onChoose={(design: LogoDesign) => {
						loadProject({
							...createDefaultProject(galleryBrief.businessName),
							brief: galleryBrief,
							variants: { primary: design.elements },
							generation: {
								layoutId: design.layoutId,
								seed: gallerySeed,
								paletteName: design.palette.name,
								fontPair: design.fontPair,
								icon: design.icon,
							},
						});
						setShowGallery(false);
						setStatus(`Opened ${design.name} for ${galleryBrief.businessName}.`);
					}}
				/>
			) : showProjects ? (
				<MyProjects
					onBack={() => setShowProjects(false)}
					onImport={() => fileInputRef.current?.click()}
					onOpen={(savedProject) => {
						void setLastProjectId(savedProject.id).then(() => {
							loadProject(savedProject);
							setShowProjects(false);
						}).catch((error: unknown) => {
							const message = error instanceof Error ? error.message : 'The project could not be opened.';
							setStatus(`Could not open project: ${message}`);
						});
					}}
				/>
			) : showMockups ? (
				<MockupStudio
					project={project}
					initialSceneId={initialMockupScene}
					onBack={() => setShowMockups(false)}
					onAddSample={() => addElement(createDefaultElement('text', {
						name: 'Brand name',
						text: project.brief?.businessName || (project.name === 'Untitled logo' ? 'Your Brand' : project.name),
						role: 'name',
						x: 90,
						y: 268,
						width: 420,
						height: 64,
					}))}
				/>
			) : <>
			<div className="logo-phase-workspace">
				<div className="logo-phase-desktop-sidebar">
					{elementLibrary}
				</div>
				<div className="logo-phase-artboard-column">
					<VariantBar
						names={Object.keys(project.variants)}
						active={activeVariant}
						outdated={primaryChanged}
						requiresManualArrangement={!project.generation && (activeVariant === 'horizontal' || activeVariant === 'vertical')}
						monochromeColor={monochromeColor}
						onSelect={setActiveVariant}
						onCreateFromPrimary={() => createFromPrimary(activeVariant)}
						onDuplicate={duplicateCurrentVariant}
						onReset={resetCurrentVariant}
						onRebuild={() => rebuildVariant(activeVariant, monochromeColor)}
						onMonochromeChange={(color) => rebuildVariant('monochrome', color)}
						onCompare={() => setShowVariantComparison(true)}
					/>
					<SvgArtboard
						project={project}
						variant={activeVariant}
						zoom={zoom}
						selectedId={selectedId}
						selectedIds={selectedIds}
						onSelect={select}
						onUpdate={updateElement}
						onBackgroundChange={setBackground}
						reference={referenceReady ? reference : null}
						onReferenceChange={updateReference}
						onReferenceRemove={removeReference}
					/>
					<p className="logo-phase-status" role="status" aria-live="polite">{status}</p>
					{fileError && <p className="logo-phase-error" role="alert">{fileError}</p>}
				</div>
				<div className="logo-phase-desktop-properties">{propertiesPanel}</div>
			</div>
			<div className={`logo-phase-mobile-sheet${mobileSheetOpen ? '' : ' is-collapsed'}`}>
				<button
					type="button"
					className="logo-phase-sheet-toggle"
					aria-expanded={mobileSheetOpen}
					onClick={() => setMobileSheetOpen((open) => !open)}
				>
					{mobileSheetOpen ? 'Hide editor panels' : 'Show editor panels'}
				</button>
				{mobileSheetOpen && (
					<>
						<div className="logo-phase-mobile-tabs" role="tablist" aria-label="Editor panels">
							<button type="button" role="tab" aria-selected={mobilePanel === 'elements'} onClick={() => setMobilePanel('elements')}>Elements</button>
							<button type="button" role="tab" aria-selected={mobilePanel === 'properties'} onClick={() => setMobilePanel('properties')}>Properties</button>
						</div>
						<div className="logo-phase-mobile-panel">
							{mobilePanel === 'elements' ? elementLibrary : propertiesPanel}
						</div>
					</>
				)}
			</div>
			</>}
			<span className="visually-hidden" aria-live="polite">{status}</span>
		</section>
	);
}
