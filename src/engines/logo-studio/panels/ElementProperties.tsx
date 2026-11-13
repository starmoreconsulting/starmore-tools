import type { Element } from '../model/types';
import { LOGO_FONT_FAMILIES } from '../library/fonts';

interface Props {
	element: Element | null;
	onUpdate: (patch: Partial<Element>) => void;
}

function numberValue(value: string, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ElementProperties({ element, onUpdate }: Props) {
	if (!element) {
		return (
			<aside className="logo-phase-panel logo-properties" aria-label="Properties">
				<h2>Properties</h2>
				<p className="logo-phase-hint">Select an element to edit its position, appearance, and text.</p>
			</aside>
		);
	}

	return (
		<aside className="logo-phase-panel logo-properties" aria-label="Properties">
			<h2>Properties</h2>
			<div className="logo-phase-number-grid">
				<label className="logo-phase-field"><span>X</span><input type="number" value={element.x} onChange={(event) => onUpdate({ x: numberValue(event.target.value, element.x) })} /></label>
				<label className="logo-phase-field"><span>Y</span><input type="number" value={element.y} onChange={(event) => onUpdate({ y: numberValue(event.target.value, element.y) })} /></label>
				<label className="logo-phase-field"><span>Width</span><input type="number" min="1" value={element.width} onChange={(event) => onUpdate({ width: Math.max(1, numberValue(event.target.value, element.width)) })} /></label>
				<label className="logo-phase-field"><span>Height</span><input type="number" min="1" value={element.height} onChange={(event) => onUpdate({ height: Math.max(1, numberValue(event.target.value, element.height)) })} /></label>
				<label className="logo-phase-field"><span>Rotation</span><input type="number" value={element.rotation} onChange={(event) => onUpdate({ rotation: numberValue(event.target.value, element.rotation) })} /></label>
				<label className="logo-phase-field"><span>Opacity</span><input type="number" min="0" max="1" step="0.05" value={element.opacity} onChange={(event) => onUpdate({ opacity: Math.min(1, Math.max(0, numberValue(event.target.value, element.opacity))) })} /></label>
			</div>
			<div className="logo-phase-number-grid">
				<label className="logo-phase-field"><span>Fill</span><input type="color" value={element.fill && /^#[\da-f]{6}$/i.test(element.fill) ? element.fill : '#ffffff'} onChange={(event) => onUpdate({ fill: event.target.value })} /></label>
				<label className="logo-phase-field"><span>Stroke</span><input type="color" value={element.stroke && /^#[\da-f]{6}$/i.test(element.stroke) ? element.stroke : '#203b32'} onChange={(event) => onUpdate({ stroke: event.target.value })} /></label>
				<label className="logo-phase-field"><span>Stroke width</span><input type="number" min="0" value={element.strokeWidth ?? 0} onChange={(event) => onUpdate({ strokeWidth: Math.max(0, numberValue(event.target.value, element.strokeWidth ?? 0)) })} /></label>
			</div>
			{element.type === 'text' && (
				<div className="logo-phase-text-options">
					<label className="logo-phase-field"><span>Text</span><textarea rows={3} value={element.text ?? ''} onChange={(event) => onUpdate({ text: event.target.value })} /></label>
					<label className="logo-phase-field"><span>Font</span><select value={element.fontFamily ?? 'Inter'} onChange={(event) => onUpdate({ fontFamily: event.target.value })}>{LOGO_FONT_FAMILIES.map((font) => <option key={font} value={font}>{font}</option>)}</select></label>
					<label className="logo-phase-field"><span>Font size</span><input type="number" min="1" value={element.fontSize ?? 48} onChange={(event) => onUpdate({ fontSize: Math.max(1, numberValue(event.target.value, element.fontSize ?? 48)) })} /></label>
					<label className="logo-phase-field"><span>Weight</span><select value={element.fontWeight ?? 400} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></label>
					<label className="logo-phase-field"><span>Letter spacing</span><input type="number" step="0.5" value={element.letterSpacing ?? 0} onChange={(event) => onUpdate({ letterSpacing: numberValue(event.target.value, element.letterSpacing ?? 0) })} /></label>
					<label className="logo-phase-field"><span>Text colour</span><input type="color" value={element.fill && /^#[\da-f]{6}$/i.test(element.fill) ? element.fill : '#203b32'} onChange={(event) => onUpdate({ fill: event.target.value })} /></label>
				</div>
			)}
		</aside>
	);
}
