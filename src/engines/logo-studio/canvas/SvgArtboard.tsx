import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { getElementGradientId, type Element, type GradientFill, type LogoProject } from '../model/types';
import { getElementBounds, movedElement, resizedElement, rotationFromPointer, type ResizeHandle } from './geometry';
import { loadLucideLibrary, type LucideIconNodes } from '../library/icons';
import { getShapeGeometry } from '../library/shapes';

interface Props {
	project: LogoProject;
	zoom: number;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onUpdate: (id: string, patch: Partial<Element>, recordHistory?: boolean) => void;
	onBackgroundChange: (background: string) => void;
}

function gradientElement(element: Element): ReactNode {
	const gradient = element.gradient;
	if (!gradient) return null;
	const id = getElementGradientId(element);
	const stops = gradient.stops.map((stop, index) => (
		<stop key={`${id}-${index}`} offset={`${Math.min(1, Math.max(0, stop.offset)) * 100}%`} stopColor={stop.color} />
	));
	if (gradient.type === 'radial') {
		return <radialGradient key={id} id={id} cx="50%" cy="50%" r="50%">{stops}</radialGradient>;
	}
	const angle = gradient.angle * Math.PI / 180;
	const x = Math.cos(angle) * 50;
	const y = Math.sin(angle) * 50;
	return <linearGradient key={id} id={id} x1={`${50 - x}%`} y1={`${50 - y}%`} x2={`${50 + x}%`} y2={`${50 + y}%`}>{stops}</linearGradient>;
}

function collectGradients(elements: Element[]): ReactNode[] {
	return elements.flatMap((element) => [
		...(element.gradient ? [gradientElement(element)] : []),
		...(element.children ? collectGradients(element.children) : []),
	]);
}

type PointerAction =
	| { type: 'move'; id: string; startX: number; startY: number; element: Element }
	| { type: 'resize'; id: string; startX: number; startY: number; element: Element; handle: ResizeHandle }
	| { type: 'rotate'; id: string; startX: number; startY: number; startAngle: number; element: Element };

const handles: { name: ResizeHandle; x: number; y: number; cursor: string }[] = [
	{ name: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
	{ name: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
	{ name: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
	{ name: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
];

function isResizeHandle(value: string | undefined): value is ResizeHandle {
	return value === 'nw' || value === 'ne' || value === 'sw' || value === 'se';
}

function findElement(elements: Element[], id: string): Element | null {
	for (const element of elements) {
		if (element.id === id) return element;
		const nested = element.children && findElement(element.children, id);
		if (nested) return nested;
	}
	return null;
}

function containsIcon(elements: Element[]): boolean {
	return elements.some((element) => element.type === 'icon' || Boolean(element.children && containsIcon(element.children)));
}

function renderIcon(element: Element, icons: LucideIconNodes | null): ReactNode {
	const nodes = element.iconName ? icons?.[element.iconName] : undefined;
	if (!nodes) return null;
	return (
		<svg x="0" y="0" width={element.width} height={element.height} viewBox="0 0 24 24" fill={element.gradient ? `url(#${getElementGradientId(element)})` : element.fill ?? 'none'} stroke={element.gradient ? `url(#${getElementGradientId(element)})` : element.stroke ?? '#203b32'} strokeWidth={element.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet" vectorEffect="non-scaling-stroke">
			{nodes.map(([tag, attributes], index) => {
				const key = `${element.id}-${index}`;
				switch (tag) {
					case 'path': return <path key={key} d={String(attributes.d ?? '')} />;
					case 'circle': return <circle key={key} cx={Number(attributes.cx)} cy={Number(attributes.cy)} r={Number(attributes.r)} />;
					case 'ellipse': return <ellipse key={key} cx={Number(attributes.cx)} cy={Number(attributes.cy)} rx={Number(attributes.rx)} ry={Number(attributes.ry)} />;
					case 'line': return <line key={key} x1={Number(attributes.x1)} y1={Number(attributes.y1)} x2={Number(attributes.x2)} y2={Number(attributes.y2)} />;
					case 'polygon': return <polygon key={key} points={String(attributes.points ?? '')} />;
					case 'polyline': return <polyline key={key} points={String(attributes.points ?? '')} />;
					case 'rect': return <rect key={key} x={Number(attributes.x ?? 0)} y={Number(attributes.y ?? 0)} width={Number(attributes.width ?? 0)} height={Number(attributes.height ?? 0)} rx={Number(attributes.rx ?? 0)} />;
					default: return null;
				}
			})}
		</svg>
	);
}

function renderShape(element: Element): ReactNode {
	const paint = element.gradient ? `url(#${getElementGradientId(element)})` : element.fill ?? '#d7ed79';
	const fill = element.shape === 'line' ? 'none' : paint;
	const stroke = element.stroke ? (element.gradient ? paint : element.stroke) : (element.shape === 'line' ? '#203b32' : 'none');
	const strokeWidth = element.strokeWidth ?? 2;
	const geometry = getShapeGeometry(element);
	const common = { fill, stroke, strokeWidth, strokeLinejoin: 'round' as const };
	switch (geometry.tag) {
		case 'rect': return <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={geometry.rx} {...common} />;
		case 'ellipse': return <ellipse cx={geometry.cx} cy={geometry.cy} rx={geometry.rx} ry={geometry.ry} {...common} />;
		case 'line': return <line x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} {...common} />;
		case 'polygon': return <polygon points={geometry.points} {...common} />;
		case 'path': return <path d={geometry.d} fillRule={geometry.fillRule} {...common} />;
	}
}

function SvgElement({
	element, selectedId, onSelect, onPointerStart,
	iconNodes,
}: {
	element: Element;
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onPointerStart: (event: ReactPointerEvent<SVGGElement>, element: Element) => void;
	iconNodes: LucideIconNodes | null;
}) {
	if (!element.visible) return null;
	const selected = element.id === selectedId;
	const content = element.type === 'text' ? (
		<text
			x={element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2}
			y={element.height / 2}
			fill={element.gradient ? `url(#${getElementGradientId(element)})` : element.fill ?? '#203b32'}
			fontFamily={element.fontFamily ?? 'Arial'}
			fontSize={element.fontSize ?? 48}
			fontWeight={element.fontWeight ?? 400}
			letterSpacing={element.letterSpacing ?? 0}
			textAnchor={element.align === 'left' ? 'start' : element.align === 'right' ? 'end' : 'middle'}
			dominantBaseline="middle"
		>
			{(element.text ?? '').split('\n').map((line, index) => (
				<tspan key={`${element.id}-${index}`} x={element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2} dy={index === 0 ? 0 : `${element.lineHeight ?? 1.16}em`}>{line}</tspan>
			))}
		</text>
	) : element.type === 'shape' ? (
		renderShape(element)
	) : element.type === 'group' ? (
		<g>
			{(element.children ?? []).map((child) => (
				<SvgElement
					key={child.id}
					element={child}
					selectedId={selectedId}
					onSelect={onSelect}
					onPointerStart={onPointerStart}
					iconNodes={iconNodes}
				/>
			))}
		</g>
	) : element.type === 'icon' ? (
		renderIcon(element, iconNodes)
	) : null;

	return (
		<g
			transform={`translate(${element.x} ${element.y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2})`}
			opacity={element.opacity}
			onPointerDown={(event) => {
				if (element.locked) return;
				event.stopPropagation();
				onSelect(element.id);
				onPointerStart(event, element);
			}}
			style={{ cursor: element.locked ? 'default' : 'move', touchAction: 'none' }}
			role="graphics-symbol"
			aria-label={element.type === 'text' ? element.text : `${element.type} element`}
		>
			{content}
			{selected && !element.locked && (
				<g className="logo-selection-controls" onPointerDown={(event) => event.stopPropagation()}>
					<rect {...getElementBounds({ ...element, x: 0, y: 0 })} fill="none" stroke="#37694f" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
					<line x1={element.width / 2} y1="0" x2={element.width / 2} y2="-25" stroke="#37694f" vectorEffect="non-scaling-stroke" pointerEvents="none" />
					<circle
						cx={element.width / 2}
						cy="-29"
						r="5"
						fill="white"
						stroke="#37694f"
						vectorEffect="non-scaling-stroke"
						style={{ cursor: 'grab', touchAction: 'none' }}
						onPointerDown={(event) => {
							event.stopPropagation();
							onPointerStart(event, element);
						}}
					/>
					{handles.map((handle) => (
						<rect
							key={handle.name}
							x={handle.x * element.width - 5}
							y={handle.y * element.height - 5}
							width="10"
							height="10"
							rx="2"
							fill="white"
							stroke="#37694f"
							vectorEffect="non-scaling-stroke"
							style={{ cursor: handle.cursor, touchAction: 'none' }}
							onPointerDown={(event) => {
								event.stopPropagation();
								onPointerStart(event, { ...element, id: `${element.id}:${handle.name}` });
							}}
						/>
					))}
				</g>
			)}
		</g>
	);
}

function pointInSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
	const point = svg.createSVGPoint();
	point.x = clientX;
	point.y = clientY;
	const matrix = svg.getScreenCTM();
	if (!matrix) return { x: clientX, y: clientY };
	const transformed = point.matrixTransform(matrix.inverse());
	return { x: transformed.x, y: transformed.y };
}

export default function SvgArtboard({ project, zoom, selectedId, onSelect, onUpdate, onBackgroundChange }: Props) {
	const svgRef = useRef<SVGSVGElement>(null);
	const actionRef = useRef<PointerAction | null>(null);
	const movedRef = useRef(false);
	const [iconNodes, setIconNodes] = useState<LucideIconNodes | null>(null);
	const background = project.artboard.background;
	const elements = project.variants.primary ?? [];

	useEffect(() => {
		if (!containsIcon(elements) || iconNodes) return;
		let active = true;
		void loadLucideLibrary().then(({ icons }) => {
			if (active) setIconNodes(icons);
		});
		return () => { active = false; };
	}, [elements, iconNodes]);

	const startPointerAction = (event: ReactPointerEvent<SVGGElement>, element: Element) => {
		const svg = svgRef.current;
		if (!svg) return;
		svg.setPointerCapture(event.pointerId);
		movedRef.current = false;
		const point = pointInSvg(svg, event.clientX, event.clientY);
		const [baseId, handle] = element.id.split(':');
		const original = findElement(project.variants.primary ?? [], baseId);
		const target = original ?? element;
		if (isResizeHandle(handle)) {
			actionRef.current = {
				type: 'resize',
				id: baseId,
				startX: point.x,
				startY: point.y,
				element: target,
				handle,
			};
		} else if (element.id === selectedId && event.target instanceof SVGCircleElement && event.target.getAttribute('cy') === '-29') {
			const centerX = target.x + target.width / 2;
			const centerY = target.y + target.height / 2;
			actionRef.current = {
				type: 'rotate',
				id: target.id,
				startX: point.x,
				startY: point.y,
				startAngle: Math.atan2(point.y - centerY, point.x - centerX) * 180 / Math.PI,
				element: target,
			};
		} else {
			actionRef.current = {
				type: 'move',
				id: target.id,
				startX: point.x,
				startY: point.y,
				element: target,
			};
		}
	};

	const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
		const action = actionRef.current;
		const svg = svgRef.current;
		if (!action || !svg) return;
		const point = pointInSvg(svg, event.clientX, event.clientY);
		const dx = point.x - action.startX;
		const dy = point.y - action.startY;
		if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
		const isFirstMove = !movedRef.current;
		movedRef.current = true;
		if (action.type === 'move') {
			onUpdate(action.id, movedElement(action.element, dx, dy), isFirstMove);
		} else if (action.type === 'resize') {
			onUpdate(action.id, resizedElement(action.element, action.handle, dx, dy), isFirstMove);
		} else {
			onUpdate(action.id, {
				rotation: rotationFromPointer(action.element, action.startAngle, point.x, point.y),
			}, isFirstMove);
		}
	};

	const stopPointerAction = (event: ReactPointerEvent<SVGSVGElement>) => {
		if (svgRef.current?.hasPointerCapture(event.pointerId)) svgRef.current.releasePointerCapture(event.pointerId);
		actionRef.current = null;
	};

	return (
		<div className={`logo-artboard-wrap${background === 'transparent' ? ' is-transparent' : ''}`}>
			<div className="logo-artboard-tools">
				<label>
					<input
						type="checkbox"
						checked={background === 'transparent'}
						onChange={(event) => onBackgroundChange(event.target.checked ? 'transparent' : '#ffffff')}
					/>
					Transparent background
				</label>
				<span>{project.artboard.width} × {project.artboard.height}</span>
			</div>
			<svg
				ref={svgRef}
				className="logo-svg-artboard"
				viewBox={`0 0 ${project.artboard.width} ${project.artboard.height}`}
				role="application"
				aria-label="Logo artboard"
				onPointerMove={onPointerMove}
				onPointerUp={stopPointerAction}
				onPointerCancel={stopPointerAction}
				onPointerDown={(event) => {
					if (event.target === event.currentTarget || (event.target as SVGElement).dataset.artboard === 'background') {
						onSelect(null);
					}
				}}
				style={{ width: `${zoom}%`, background: background === 'transparent' ? 'transparent' : background, touchAction: 'none' }}
			>
				<rect data-artboard="background" width="100%" height="100%" fill={background === 'transparent' ? 'transparent' : background} />
				<defs>{collectGradients(elements)}</defs>
				{elements.map((element) => (
					<SvgElement
						key={element.id}
						element={element}
						selectedId={selectedId}
						onSelect={onSelect}
						onPointerStart={startPointerAction}
						iconNodes={iconNodes}
					/>
				))}
			</svg>
		</div>
	);
}
