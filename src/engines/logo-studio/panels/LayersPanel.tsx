import { useState, type DragEvent } from 'react';
import type { Element } from '../model/types';

interface Props {
	elements: Element[];
	selectedIds: string[];
	artboardWidth: number;
	artboardHeight: number;
	onSelect: (id: string, extend: boolean) => void;
	onUpdate: (id: string, patch: Partial<Element>) => void;
	onReorder: (id: string, targetId: string) => void;
	onGroup: () => void;
	onUngroup: () => void;
	onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', toArtboard: boolean) => void;
	onDistribute: (axis: 'horizontal' | 'vertical') => void;
}

const typeMarks: Record<Element['type'], string> = {
	text: 'T',
	shape: '◇',
	icon: '✳',
	image: '▧',
	group: '▣',
};

function layerName(element: Element): string {
	if (element.name?.trim()) return element.name;
	if (element.type === 'text') return element.text?.slice(0, 24) || 'Text';
	if (element.type === 'icon') return element.iconName || 'Icon';
	return element.shape ?? element.type;
}

export default function LayersPanel({ elements, selectedIds, artboardWidth, artboardHeight, onSelect, onUpdate, onReorder, onGroup, onUngroup, onAlign, onDistribute }: Props) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [alignToArtboard, setAlignToArtboard] = useState(false);

	const handleDrop = (event: DragEvent<HTMLLIElement>, targetId: string) => {
		event.preventDefault();
		const draggedId = event.dataTransfer.getData('text/logo-layer');
		if (draggedId && draggedId !== targetId) onReorder(draggedId, targetId);
	};

	const renderRows = (items: Element[], depth = 0) => items.map((element) => {
		const selected = selectedIds.includes(element.id);
		const isExpanded = expanded.has(element.id);
		const canExpand = element.type === 'group' && Boolean(element.children?.length);
		return (
			<li
				key={element.id}
				className={`logo-layer-row${selected ? ' is-selected' : ''}`}
				draggable
				onDragStart={(event) => {
					event.dataTransfer.setData('text/logo-layer', element.id);
					event.dataTransfer.effectAllowed = 'move';
				}}
				onDragOver={(event) => event.preventDefault()}
				onDrop={(event) => handleDrop(event, element.id)}
				style={{ paddingLeft: `${depth * 14}px` }}
			>
				<div className="logo-layer-main">
					{element.type === 'group' ? (
						<button
							type="button"
							className="logo-layer-expand"
							aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${layerName(element)}`}
							aria-expanded={isExpanded}
							onClick={() => setExpanded((previous) => {
								const next = new Set(previous);
								if (next.has(element.id)) next.delete(element.id);
								else next.add(element.id);
								return next;
							})}
						>{canExpand ? (isExpanded ? '▾' : '▸') : '·'}</button>
					) : <span className="logo-layer-expand-spacer" />}
					<span className="logo-layer-type" aria-hidden="true">{typeMarks[element.type]}</span>
					<input
						className="logo-layer-name"
						aria-label={`Rename ${layerName(element)}`}
						defaultValue={layerName(element)}
						onBlur={(event) => {
							const name = event.currentTarget.value.trim();
							if (name && name !== element.name) onUpdate(element.id, { name });
							if (!name) event.currentTarget.value = layerName(element);
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') event.currentTarget.blur();
						}}
						onClick={() => onSelect(element.id, false)}
					/>
					<button type="button" className="logo-layer-toggle" aria-label={`${element.visible ? 'Hide' : 'Show'} ${layerName(element)}`} aria-pressed={element.visible} onClick={() => onUpdate(element.id, { visible: !element.visible })}>{element.visible ? '◉' : '○'}</button>
					<button type="button" className="logo-layer-toggle" aria-label={`${element.locked ? 'Unlock' : 'Lock'} ${layerName(element)}`} aria-pressed={element.locked} onClick={() => onUpdate(element.id, { locked: !element.locked })}>{element.locked ? '▣' : '□'}</button>
				</div>
				<button type="button" className="logo-layer-select" aria-label={`Select ${layerName(element)}`} aria-pressed={selected} onClick={(event) => onSelect(element.id, event.shiftKey)} />
				{canExpand && isExpanded && <ul className="logo-layer-children">{renderRows(element.children ?? [], depth + 1)}</ul>}
			</li>
		);
	});

	const selectedGroup = selectedIds.length === 1 && elements.some((element) => element.id === selectedIds[0] && element.type === 'group');
	const alignments = [
		['left', 'Align left'], ['center', 'Align centre'], ['right', 'Align right'],
		['top', 'Align top'], ['middle', 'Align middle'], ['bottom', 'Align bottom'],
	] as const;
	return (
		<section className="logo-library-section logo-layers-panel" aria-label="Layers">
			<div className="logo-layer-actions">
				<button type="button" disabled={selectedIds.length < 2} onClick={onGroup}>Group</button>
				<button type="button" disabled={!selectedGroup} onClick={onUngroup}>Ungroup</button>
			</div>
			<h3 className="logo-library-subheading">Align</h3>
			<label className="logo-align-target"><input type="checkbox" checked={alignToArtboard} onChange={(event) => setAlignToArtboard(event.target.checked)} /> Relative to artboard ({artboardWidth} × {artboardHeight})</label>
			<div className="logo-align-grid">
				{alignments.map(([key, label]) => <button key={key} type="button" disabled={!selectedIds.length} aria-label={label} title={label} onClick={() => onAlign(key, alignToArtboard)}>{label.replace('Align ', '')}</button>)}
			</div>
			<div className="logo-layer-actions">
				<button type="button" disabled={selectedIds.length < 3} onClick={() => onDistribute('horizontal')}>Distribute horizontally</button>
				<button type="button" disabled={selectedIds.length < 3} onClick={() => onDistribute('vertical')}>Distribute vertically</button>
			</div>
			{elements.length ? <ul className="logo-layer-list">{renderRows([...elements].reverse())}</ul> : <p className="logo-phase-hint">Add an element to begin building your layers.</p>}
			<p className="logo-phase-hint">Drag layers to reorder. Hold Shift to select more than one.</p>
		</section>
	);
}
