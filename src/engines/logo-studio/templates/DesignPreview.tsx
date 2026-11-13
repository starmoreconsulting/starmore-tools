import { getShapeGeometry } from '../library/shapes';
import type { Element } from '../model/types';
import type { LucideIconNodes } from '../library/icons';
import type { LogoDesign } from './generator';

function renderShape(element: Element) {
	const geometry = getShapeGeometry(element);
	const fill = element.shape === 'line' ? 'none' : element.fill ?? '#d7ed79';
	const common = { fill, stroke: element.stroke ?? (element.shape === 'line' ? '#203b32' : 'none'), strokeWidth: element.strokeWidth ?? 0, strokeLinejoin: 'round' as const };
	switch (geometry.tag) {
		case 'rect': return <rect x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx={geometry.rx} {...common} />;
		case 'ellipse': return <ellipse cx={geometry.cx} cy={geometry.cy} rx={geometry.rx} ry={geometry.ry} {...common} />;
		case 'line': return <line x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} {...common} />;
		case 'polygon': return <polygon points={geometry.points} {...common} />;
		case 'path': return <path d={geometry.d} fillRule={geometry.fillRule} {...common} />;
	}
}

function renderIcon(element: Element, icons: LucideIconNodes | null) {
	const nodes = element.iconName ? icons?.[element.iconName] : undefined;
	if (!nodes) return null;
	return <svg x="0" y="0" width={element.width} height={element.height} viewBox="0 0 24 24" fill={element.fill ?? 'none'} stroke={element.stroke ?? '#203b32'} strokeWidth={element.strokeWidth ?? 2} strokeLinecap="round" strokeLinejoin="round">
		{nodes.map(([tag, attributes], index) => {
			const props = { key: `${element.id}-${index}` };
			switch (tag) {
				case 'path': return <path {...props} d={String(attributes.d ?? '')} />;
				case 'circle': return <circle {...props} cx={Number(attributes.cx)} cy={Number(attributes.cy)} r={Number(attributes.r)} />;
				case 'ellipse': return <ellipse {...props} cx={Number(attributes.cx)} cy={Number(attributes.cy)} rx={Number(attributes.rx)} ry={Number(attributes.ry)} />;
				case 'line': return <line {...props} x1={Number(attributes.x1)} y1={Number(attributes.y1)} x2={Number(attributes.x2)} y2={Number(attributes.y2)} />;
				case 'polygon': return <polygon {...props} points={String(attributes.points ?? '')} />;
				case 'polyline': return <polyline {...props} points={String(attributes.points ?? '')} />;
				case 'rect': return <rect {...props} x={Number(attributes.x ?? 0)} y={Number(attributes.y ?? 0)} width={Number(attributes.width ?? 0)} height={Number(attributes.height ?? 0)} rx={Number(attributes.rx ?? 0)} />;
				default: return null;
			}
		})}
	</svg>;
}

function renderElement(element: Element, icons: LucideIconNodes | null) {
	if (!element.visible) return null;
	let content = null;
	if (element.type === 'shape') content = renderShape(element);
	else if (element.type === 'path') content = <path d={element.d ?? ''} fill={element.fill ?? '#203b32'} stroke={element.stroke ?? 'none'} strokeWidth={element.strokeWidth ?? 0} fillRule={element.fillRule ?? 'nonzero'} />;
	else if (element.type === 'icon') content = renderIcon(element, icons);
	else if (element.type === 'group') content = (element.children ?? []).map((child) => <g key={child.id}>{renderElement(child, icons)}</g>);
	else if (element.type === 'text') {
		const x = element.align === 'left' ? 0 : element.align === 'right' ? element.width : element.width / 2;
		content = <text x={x} y={element.height / 2} fill={element.fill ?? '#203b32'} fontFamily={element.fontFamily ?? 'Inter'} fontSize={element.fontSize ?? 48} fontWeight={element.fontWeight ?? 400} letterSpacing={element.letterSpacing ?? 0} textAnchor={element.align === 'left' ? 'start' : element.align === 'right' ? 'end' : 'middle'} dominantBaseline="middle">
			{(element.text ?? '').split('\n').map((line, index) => <tspan key={`${element.id}-${index}`} x={x} dy={index === 0 ? 0 : `${element.lineHeight ?? 1.16}em`}>{line}</tspan>)}
		</text>;
	}
	return <g transform={`translate(${element.x} ${element.y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2})`} opacity={element.opacity}>{content}</g>;
}

export function DesignPreview({ design, icons, background = 'transparent' }: { design: LogoDesign; icons: LucideIconNodes | null; background?: string }) {
	return <svg className="logo-gallery-preview" viewBox="0 0 600 600" role="img" aria-label={`${design.name} preview for ${design.elements.find((element) => element.type === 'text')?.text ?? 'business name'}`}>
		{background !== 'transparent' && <rect width="600" height="600" fill={background} />}
		{design.elements.map((element) => <g key={element.id}>{renderElement(element, icons)}</g>)}
	</svg>;
}
