import { lazy, Suspense, useState } from 'react';
import { createDefaultElement, type Element } from '../model/types';
import type { BrandKit } from '../brand/kit';
const IconLibrary = lazy(() => import('./IconLibrary'));
const ColorLibrary = lazy(() => import('./ColorLibrary'));
const FontBrowser = lazy(() => import('./FontBrowser'));
const LayersPanel = lazy(() => import('./LayersPanel'));
const FieldsPanel = lazy(() => import('./FieldsPanel'));

const shapes = ['rectangle', 'rounded-rectangle', 'circle', 'triangle', 'polygon', 'star', 'arrow', 'line', 'ring', 'hexagon', 'diamond', 'shield', 'leaf', 'drop', 'bolt'] as const;

interface Props {
	onAdd: (element: Element) => void;
	onImportSvg: () => void;
	onImportIcon: () => void;
	element?: Element | null;
	onUpdate?: (patch: Partial<Element>) => void;
	elements?: Element[];
	selectedIds?: string[];
	onSelect?: (id: string, extend: boolean) => void;
	onLayerUpdate?: (id: string, patch: Partial<Element>) => void;
	onReorder?: (id: string, targetId: string) => void;
	onGroup?: () => void;
	onUngroup?: () => void;
	artboardWidth?: number;
	artboardHeight?: number;
	onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', toArtboard: boolean) => void;
	onDistribute?: (axis: 'horizontal' | 'vertical') => void;
	project?: import('../model/types').LogoProject;
	activeVariant?: string;
	brandKit?: BrandKit | null;
}

export default function ElementSidebar({
	onAdd,
	onImportSvg,
	onImportIcon,
	element = null,
	onUpdate = () => undefined,
	elements = [],
	selectedIds = [],
	onSelect = () => undefined,
	onLayerUpdate = () => undefined,
	onReorder = () => undefined,
	onGroup = () => undefined,
	onUngroup = () => undefined,
	artboardWidth = 600,
	artboardHeight = 600,
	onAlign = () => undefined,
	onDistribute = () => undefined,
	project,
	activeVariant = 'primary',
	brandKit = null,
}: Props) {
	const [shape, setShape] = useState<(typeof shapes)[number]>('rectangle');
	const [tab, setTab] = useState<'elements' | 'icons' | 'colors' | 'fonts' | 'layers' | 'fields'>('elements');

	const addText = () => onAdd(createDefaultElement('text', {
		x: 90,
		y: 268,
		width: 420,
		height: 64,
	}));

	const addShape = () => onAdd(createDefaultElement('shape', {
		shape,
		x: 240,
		y: 240,
		width: shape === 'line' ? 140 : 120,
		height: shape === 'line' ? 0 : 120,
		fill: shape === 'line' ? 'none' : '#d7ed79',
		stroke: '#203b32',
		strokeWidth: 2,
		radius: shape === 'rounded-rectangle' ? 18 : 0,
	}));

	return (
		<aside className="logo-phase-panel logo-element-sidebar" aria-label="Add elements">
			<h2>Library</h2>
			<div className="logo-library-tabs" role="tablist" aria-label="Libraries">
				<button type="button" role="tab" aria-selected={tab === 'elements'} onClick={() => setTab('elements')}>Elements</button>
				<button type="button" role="tab" aria-selected={tab === 'icons'} onClick={() => setTab('icons')}>Icons</button>
				<button type="button" role="tab" aria-selected={tab === 'colors'} onClick={() => setTab('colors')}>Colours</button>
				<button type="button" role="tab" aria-selected={tab === 'fonts'} onClick={() => setTab('fonts')}>Fonts</button>
				<button type="button" role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')}>Layers</button>
				<button type="button" role="tab" aria-selected={tab === 'fields'} onClick={() => setTab('fields')}>Fields</button>
			</div>
			{tab === 'icons' ? (
				<Suspense fallback={<p className="logo-phase-hint">Loading icon browser…</p>}>
					<IconLibrary onAdd={onAdd} />
				</Suspense>
			) : tab === 'colors' ? (
				<Suspense fallback={<p className="logo-phase-hint">Loading colours…</p>}>
					<ColorLibrary element={element} onUpdate={onUpdate} brandColors={brandKit?.colors} />
				</Suspense>
			) : tab === 'fonts' ? (
				<Suspense fallback={<p className="logo-phase-hint">Loading font browser…</p>}>
					<FontBrowser element={element} onUpdate={onUpdate} brandFonts={brandKit?.fonts} />
				</Suspense>
			) : tab === 'layers' ? (
				<Suspense fallback={<p className="logo-phase-hint">Loading layers…</p>}>
					<LayersPanel elements={elements} selectedIds={selectedIds} artboardWidth={artboardWidth} artboardHeight={artboardHeight} onSelect={onSelect} onUpdate={onLayerUpdate} onReorder={onReorder} onGroup={onGroup} onUngroup={onUngroup} onAlign={onAlign} onDistribute={onDistribute} />
				</Suspense>
			) : tab === 'fields' ? (
				<Suspense fallback={<p className="logo-phase-hint">Loading fields…</p>}>
					{project ? <FieldsPanel project={project} activeVariant={activeVariant} /> : <p className="logo-phase-hint">Field preview is unavailable.</p>}
				</Suspense>
			) : <>
			<button className="logo-phase-primary" type="button" onClick={addText}>Add text</button>
			<label className="logo-phase-field">
				<span>Shape</span>
				<select value={shape} onChange={(event) => {
					const nextShape = shapes.find((item) => item === event.target.value);
					if (nextShape) setShape(nextShape);
				}}>
					{shapes.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
				</select>
			</label>
			<button type="button" onClick={addShape}>Add shape</button>
			<div className="logo-svg-import-actions">
				<button type="button" onClick={onImportSvg}>Import SVG</button>
				<button type="button" onClick={onImportIcon}>Upload custom icon (SVG)</button>
			</div>
			<p className="logo-phase-hint">Drag elements on the artboard to position them.</p>
			</>}
		</aside>
	);
}
