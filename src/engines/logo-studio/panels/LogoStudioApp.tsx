import { useEffect, useMemo, useState } from 'react';
import SvgArtboard from '../canvas/SvgArtboard';
import { createDefaultElement, type Element } from '../model/types';
import { useLogoStudioStore } from '../store/store';
import ElementProperties from './ElementProperties';
import ElementSidebar from './ElementSidebar';
import PhaseOneToolbar from './PhaseOneToolbar';
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

export default function LogoStudioApp() {
	const project = useLogoStudioStore((state) => state.project);
	const selectedId = useLogoStudioStore((state) => state.selectedId);
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
	const undo = useLogoStudioStore((state) => state.undo);
	const redo = useLogoStudioStore((state) => state.redo);
	const [zoom, setZoom] = useState(100);
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>('elements');
	const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
	const [status, setStatus] = useState('Your design stays in this browser session.');
	const elements = project.variants.primary ?? [];
	const selectedElement = useMemo(() => findElement(elements, selectedId), [elements, selectedId]);
	const addText = () => addElement(createDefaultElement('text', { x: 90, y: 268, width: 420, height: 64 }));

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

	return (
		<section className="logo-phase-app" aria-label="Logo Studio editor">
			<PhaseOneToolbar
				canUndo={pastCount > 0}
				canRedo={futureCount > 0}
				zoom={zoom}
				onUndo={undo}
				onRedo={redo}
				onZoomChange={setZoom}
				onSave={() => setStatus('Save is a placeholder in this phase.')}
			/>
			<div className="logo-phase-workspace">
				<div className="logo-phase-desktop-sidebar">
					<ElementSidebar onAdd={addElement} />
				</div>
				<div className="logo-phase-artboard-column">
					<SvgArtboard
						project={project}
						zoom={zoom}
						selectedId={selectedId}
						onSelect={select}
						onUpdate={updateElement}
						onBackgroundChange={setBackground}
					/>
					<p className="logo-phase-status" role="status" aria-live="polite">{status}</p>
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
							{mobilePanel === 'elements' ? <ElementSidebar onAdd={addElement} /> : propertiesPanel}
						</div>
					</>
				)}
			</div>
			<span className="visually-hidden" aria-live="polite">{status}</span>
		</section>
	);
}
