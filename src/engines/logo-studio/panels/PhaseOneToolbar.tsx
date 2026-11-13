interface Props {
	canUndo: boolean;
	canRedo: boolean;
	zoom: number;
	onUndo: () => void;
	onRedo: () => void;
	onZoomChange: (zoom: number) => void;
	onSave: () => void;
	onOpenProject: () => void;
	onProjects: () => void;
}

export default function PhaseOneToolbar({ canUndo, canRedo, zoom, onUndo, onRedo, onZoomChange, onSave, onOpenProject, onProjects }: Props) {
	return (
		<header className="logo-phase-toolbar">
			<a href="/" className="logo-phase-brand">Starmore <span>Logo Studio</span></a>
			<div className="logo-phase-toolbar-actions" role="toolbar" aria-label="Logo editing controls">
				<button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo">Undo</button>
				<button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">Redo</button>
				<div className="logo-zoom-control" aria-label="Zoom controls">
					<button type="button" onClick={() => onZoomChange(Math.max(50, zoom - 10))} disabled={zoom <= 50} aria-label="Zoom out">−</button>
					<output aria-live="polite">{zoom}%</output>
					<button type="button" onClick={() => onZoomChange(Math.min(150, zoom + 10))} disabled={zoom >= 150} aria-label="Zoom in">+</button>
				</div>
				<button type="button" onClick={onOpenProject}>Open project file</button>
				<button type="button" onClick={onSave}>Save project file</button>
				<button type="button" onClick={onProjects}>My Projects</button>
			</div>
		</header>
	);
}
