import { useState } from 'react';
import { buildBorderRadiusCss } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

const initialCorners = { topLeft: 24, topRight: 24, bottomRight: 24, bottomLeft: 24 };
type Corner = keyof typeof initialCorners;

export function BorderRadiusGenerator() {
	const [corners, setCorners] = useState(initialCorners);
	const [unit, setUnit] = useState<'px' | '%'>('px');
	const [linked, setLinked] = useState(true);
	const css = buildBorderRadiusCss({ ...corners, unit });
	const updateCorner = (corner: Corner, value: number) => {
		const safeValue = Number.isFinite(value) ? Math.min(500, Math.max(0, value)) : 0;
		setCorners((previous) => linked
			? { topLeft: safeValue, topRight: safeValue, bottomRight: safeValue, bottomLeft: safeValue }
			: { ...previous, [corner]: safeValue });
	};

	return (
		<div>
			<div className="json-columns">
				<div><label>Preview</label><div style={{ height: 170, display: 'grid', placeItems: 'center', background: '#f0f1ec', padding: 18 }}><div style={{ width: '100%', maxWidth: 280, height: 110, background: '#6b5b95', borderRadius: `${corners.topLeft}${unit} ${corners.topRight}${unit} ${corners.bottomRight}${unit} ${corners.bottomLeft}${unit}` }} aria-label="Border radius preview" /></div></div>
				<div><label>CSS</label><GeneratorOutput output={css} filename="border-radius.css" emptyText="" /></div>
			</div>
			<div className="json-columns" style={{ marginTop: 14 }}>
				{(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((corner) => (
					<div className="calc-field" key={corner}>
						<label htmlFor={`radius-${corner}`}>{corner.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}</label>
						<input id={`radius-${corner}`} type="number" min="0" max="500" value={corners[corner]} onChange={(event) => updateCorner(corner, Number(event.target.value))} />
					</div>
				))}
				<div className="calc-field"><label htmlFor="radius-unit">Unit</label><select id="radius-unit" value={unit} onChange={(event) => setUnit(event.target.value as 'px' | '%')}><option value="px">Pixels</option><option value="%">Percent</option></select></div>
			</div>
			<label className="tool-choice" style={{ marginTop: 12 }}><input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} /> <span>Link all corners</span></label>
			<p className="html-formatter-note">Set one shared radius or unlink corners to tune each side independently. Percentage values are relative to the element’s dimensions.</p>
		</div>
	);
}

export default BorderRadiusGenerator;
