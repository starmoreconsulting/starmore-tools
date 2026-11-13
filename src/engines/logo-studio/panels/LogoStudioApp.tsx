import { useEffect, useMemo, useRef, useState } from 'react';
import SvgArtboard from '../canvas/SvgArtboard';
import { createDefaultElement, createDefaultProject, type Element, type LogoBrief } from '../model/types';
import { useLogoStudioStore } from '../store/store';
import ElementProperties from './ElementProperties';
import ElementSidebar from './ElementSidebar';
import PhaseOneToolbar from './PhaseOneToolbar';
import { loadBrowserFont } from '../library/fonts';
import { readProjectFile } from '../export/project-file';
import MyProjects from './MyProjects';
import ExportCenter from './ExportCenter';
import SetupFlow from './SetupFlow';
import { restoreLastProject, saveLocalProject, setLastProjectId } from '../store/local-projects';
import './phase-one.css';

type MobilePanel = 'elements' | 'properties';

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

export default function LogoStudioApp() {
	const project = useLogoStudioStore((state) => state.project);
	const selectedId = useLogoStudioStore((state) => state.selectedId);
	const selectedIds = useLogoStudioStore((state) => state.selectedIds);
	const pastCount = useLogoStudioStore((state) => state.past.length);
	const futureCount = useLogoStudioStore((state) => state.future.length);
	const select = useLogoStudioStore((state) => state.select);
	const updateElement = useLogoStudioStore((state) => state.updateElement);
	const addElement = useLogoStudioStore((state) => state.addElement);
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
	const [zoom, setZoom] = useState(100);
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>('elements');
	const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
	const [status, setStatus] = useState('Your design stays on this device.');
	const [fileError, setFileError] = useState('');
	const [storageReady, setStorageReady] = useState(false);
	const [showProjects, setShowProjects] = useState(false);
	const [showExportCenter, setShowExportCenter] = useState(false);
	const [showSetup, setShowSetup] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const elements = project.variants.primary ?? [];
	const selectedElement = useMemo(() => findElement(elements, selectedId), [elements, selectedId]);
	const addText = () => addElement(createDefaultElement('text', { x: 90, y: 268, width: 420, height: 64 }));
	const openProjectFile = async (file: File | undefined) => {
		if (!file) return;
		try {
			const imported = await readProjectFile(file);
			loadProject(imported);
			await saveLocalProject(imported);
			setStatus(`Opened “${imported.name}”.`);
			setFileError('');
			setShowProjects(false);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'The project file could not be opened.';
			setFileError(message);
			setStatus(message);
		}
	};

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
				onNewLogo={() => setShowSetup(true)}
				onProjects={() => setShowProjects(true)}
				onExport={() => setShowExportCenter(true)}
			/>
			{showSetup && <SetupFlow
				onSkip={() => {
					loadProject(createDefaultProject());
					setShowSetup(false);
					setShowProjects(false);
				}}
				onComplete={(brief: LogoBrief) => {
					loadProject({ ...createDefaultProject(brief.businessName), brief });
					setShowSetup(false);
					setShowProjects(false);
					setStatus(`Brief saved for ${brief.businessName}.`);
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
			{showExportCenter && <ExportCenter project={project} onClose={() => setShowExportCenter(false)} />}
			{showProjects ? (
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
			) : <>
			<div className="logo-phase-workspace">
				<div className="logo-phase-desktop-sidebar">
					{elementLibrary}
				</div>
				<div className="logo-phase-artboard-column">
					<SvgArtboard
						project={project}
						zoom={zoom}
						selectedId={selectedId}
						selectedIds={selectedIds}
						onSelect={select}
						onUpdate={updateElement}
						onBackgroundChange={setBackground}
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
