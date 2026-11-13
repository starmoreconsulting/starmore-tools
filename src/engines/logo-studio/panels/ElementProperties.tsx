import type { Element } from '../model/types';
import { logoFonts } from '../library/fonts';

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
			<label className="logo-phase-field">
				<span>Role</span>
				<select aria-label="Element role" value={element.role ?? 'other'} onChange={(event) => onUpdate({ role: event.target.value as Element['role'] })}>
					<option value="icon">Icon</option>
					<option value="name">Name</option>
					<option value="tagline">Tagline</option>
					<option value="decor">Decoration</option>
					<option value="other">Other</option>
				</select>
			</label>
			{(element.type === 'text' || element.type === 'image') && (
				<label className="logo-phase-field">
					<span>Field name</span>
					<input
						aria-label="Field name"
						value={element.fieldName ?? ''}
						maxLength={100}
						placeholder={element.type === 'text' ? 'e.g. name or tagline' : 'e.g. product-image'}
						onChange={(event) => onUpdate({ fieldName: event.target.value.trim() ? event.target.value : undefined })}
					/>
				</label>
			)}
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
			{element.type === 'shape' && (element.shape === 'polygon' || element.shape === 'star') && (
				<label className="logo-phase-field">
					<span>{element.shape === 'star' ? 'Points' : 'Sides'}</span>
					<input
						type="number"
						min={3}
						max={12}
						value={element.shape === 'star' ? element.points ?? 5 : element.sides ?? 6}
						onChange={(event) => {
							const count = Math.min(12, Math.max(3, Math.round(numberValue(event.target.value, 5))));
							onUpdate(element.shape === 'star' ? { points: count } : { sides: count });
						}}
					/>
				</label>
			)}
			{element.type === 'shape' && (element.shape === 'rectangle' || element.shape === 'rounded-rectangle') && (
				<label className="logo-phase-field">
					<span>Corner radius</span>
					<input type="number" min={0} value={element.radius ?? 0} onChange={(event) => onUpdate({ radius: Math.max(0, numberValue(event.target.value, element.radius ?? 0)) })} />
				</label>
			)}
			<section className="logo-effect-panel" aria-label="Shadow effect">
				<label className="logo-effect-toggle"><input type="checkbox" checked={Boolean(element.shadow)} onChange={(event) => onUpdate({
					shadow: event.target.checked
						? (element.shadow ?? { offsetX: 4, offsetY: 4, blur: 8, color: '#000000' })
						: undefined,
				})} /> Shadow</label>
				{element.shadow && (
					<div className="logo-phase-number-grid">
						<label className="logo-phase-field"><span>Offset X</span><input type="number" min={-100} max={100} value={element.shadow.offsetX} onChange={(event) => onUpdate({ shadow: { ...element.shadow!, offsetX: numberValue(event.target.value, element.shadow!.offsetX) } })} /></label>
						<label className="logo-phase-field"><span>Offset Y</span><input type="number" min={-100} max={100} value={element.shadow.offsetY} onChange={(event) => onUpdate({ shadow: { ...element.shadow!, offsetY: numberValue(event.target.value, element.shadow!.offsetY) } })} /></label>
						<label className="logo-phase-field"><span>Blur</span><input type="number" min={0} max={80} value={element.shadow.blur} onChange={(event) => onUpdate({ shadow: { ...element.shadow!, blur: Math.max(0, numberValue(event.target.value, element.shadow!.blur)) } })} /></label>
						<label className="logo-phase-field"><span>Shadow colour</span><input type="color" value={element.shadow.color} onChange={(event) => onUpdate({ shadow: { ...element.shadow!, color: event.target.value } })} /></label>
					</div>
				)}
			</section>
			{element.type === 'text' && (
				<div className="logo-phase-text-options">
					<label className="logo-phase-field"><span>Text</span><textarea rows={3} value={element.text ?? ''} onChange={(event) => onUpdate({ text: event.target.value })} /></label>
					<label className="logo-phase-field"><span>Font</span><select value={element.fontFamily ?? 'Inter'} onChange={(event) => onUpdate({ fontFamily: event.target.value })}>{logoFonts.map((font) => <option key={font.family} value={font.family}>{font.family}</option>)}</select></label>
					<label className="logo-phase-field"><span>Font size</span><input type="number" min="1" value={element.fontSize ?? 48} onChange={(event) => onUpdate({ fontSize: Math.max(1, numberValue(event.target.value, element.fontSize ?? 48)) })} /></label>
					<label className="logo-phase-field"><span>Weight</span><select value={element.fontWeight ?? 400} onChange={(event) => onUpdate({ fontWeight: Number(event.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option></select></label>
					<label className="logo-phase-field"><span>Letter spacing</span><input type="number" step="0.5" value={element.letterSpacing ?? 0} onChange={(event) => onUpdate({ letterSpacing: numberValue(event.target.value, element.letterSpacing ?? 0) })} /></label>
					<label className="logo-phase-field"><span>Curve: {element.curve ?? 0}</span><input type="range" min={-100} max={100} step={1} value={element.curve ?? 0} onChange={(event) => onUpdate({ curve: Number(event.target.value) })} /></label>
					<label className="logo-phase-field"><span>Text colour</span><input type="color" value={element.fill && /^#[\da-f]{6}$/i.test(element.fill) ? element.fill : '#203b32'} onChange={(event) => onUpdate({ fill: event.target.value })} /></label>
				</div>
			)}
			{element.type === 'image' && (
				<label className="logo-phase-field">
					<span>Image fit</span>
					<select value={element.fit ?? 'contain'} onChange={(event) => onUpdate({ fit: event.target.value as Element['fit'] })}>
						<option value="contain">Contain</option>
						<option value="cover">Cover</option>
					</select>
				</label>
			)}
		</aside>
	);
}
