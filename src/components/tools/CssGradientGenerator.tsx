import { useState } from 'react';
import { buildGradientCss, sortGradientStops, type GradientStop, type GradientType } from '../../engines/css-gradient';

let nextStopId = 1;

export default function CssGradientGenerator() {
	const [type, setType] = useState<GradientType>('linear');
	const [angle, setAngle] = useState(135);
	const [radialShape, setRadialShape] = useState<'circle' | 'ellipse'>('ellipse');
	const [radialSize, setRadialSize] = useState<'closest-side' | 'farthest-side' | 'closest-corner' | 'farthest-corner'>('farthest-corner');
	const [radialPosition, setRadialPosition] = useState('center');
	const [repeating, setRepeating] = useState(false);
	const [stops, setStops] = useState<GradientStop[]>([
		{ id: '1', color: '#22d3ee', position: 0 },
		{ id: '2', color: '#8b5cf6', position: 100 },
	]);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	let css = '';
	try {
		css = buildGradientCss(type, stops, { angle, radialShape, radialSize, radialPosition, repeating });
	} catch (error) {
		css = '';
		isError;
	}

	const updateStop = (id: string, updates: Partial<GradientStop>) => {
		setStops((previous) => previous.map((stop) => stop.id === id ? { ...stop, ...updates } : stop));
		setMessage('');
		setIsError(false);
	};

	const addStop = () => {
		if (stops.length >= 12) {
			setMessage('A maximum of 12 gradient stops is supported.');
			setIsError(true);
			return;
		}
		const id = String(nextStopId++);
		const position = stops.length === 0 ? 0 : 50;
		setStops((previous) => [...previous, { id, color: '#ec4899', position }]);
		setMessage('');
		setIsError(false);
	};

	const removeStop = (id: string) => {
		setStops((previous) => previous.length <= 1 ? previous : previous.filter((stop) => stop.id !== id));
		setMessage('');
		setIsError(false);
	};

	const copy = async () => {
		if (!css) return;
		try {
			await navigator.clipboard.writeText(`background: ${css};`);
			setMessage('CSS copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the CSS instead.');
			setIsError(true);
		}
	};

	const clear = () => {
		setStops([{ id: '1', color: '#22d3ee', position: 0 }, { id: '2', color: '#8b5cf6', position: 100 }]);
		setType('linear');
		setAngle(135);
		setRepeating(false);
		setMessage('');
		setIsError(false);
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label>Gradient preview</label>
					<div className="css-gradient-preview" style={{ background: css || '#e5e5dc' }} aria-label="Gradient preview" />
				</div>
				<div>
					<label htmlFor="gradient-css-output">CSS output</label>
					<pre className="json-output" id="gradient-css-output">{css ? `background: ${css};` : 'Adjust the stops to create valid CSS.'}</pre>
				</div>
			</div>
			<div className="json-columns" style={{ marginTop: 14 }}>
				<div className="calc-field">
					<label htmlFor="gradient-type">Gradient type</label>
					<select id="gradient-type" value={type} onChange={(event) => setType(event.target.value as GradientType)}>
						<option value="linear">Linear</option>
						<option value="radial">Radial</option>
						<option value="conic">Conic</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="gradient-angle">Angle</label>
					<input id="gradient-angle" type="number" min="-360" max="360" value={angle} onChange={(event) => setAngle(Number(event.target.value))} disabled={type === 'radial'} />
				</div>
			</div>
			{type === 'radial' && (
				<div className="json-columns" style={{ marginTop: 14 }}>
					<div className="calc-field"><label htmlFor="radial-shape">Shape</label><select id="radial-shape" value={radialShape} onChange={(event) => setRadialShape(event.target.value as 'circle' | 'ellipse')}><option value="ellipse">Ellipse</option><option value="circle">Circle</option></select></div>
					<div className="calc-field"><label htmlFor="radial-size">Size</label><select id="radial-size" value={radialSize} onChange={(event) => setRadialSize(event.target.value as typeof radialSize)}><option value="closest-side">Closest side</option><option value="farthest-side">Farthest side</option><option value="closest-corner">Closest corner</option><option value="farthest-corner">Farthest corner</option></select></div>
					<div className="calc-field"><label htmlFor="radial-position">Position</label><input id="radial-position" value={radialPosition} onChange={(event) => setRadialPosition(event.target.value)} placeholder="center or 25% 75%" /></div>
				</div>
			)}
			<label className="tool-choice" style={{ marginTop: 12 }}><input type="checkbox" checked={repeating} onChange={(event) => setRepeating(event.target.checked)} /> <span>Repeating gradient</span></label>
			<fieldset className="duplicate-options">
				<legend>Colour stops</legend>
				{sortGradientStops(stops).map((stop) => (
					<div className="gradient-stop-row" key={stop.id}>
						<input aria-label="Stop colour" type="color" value={stop.color} onChange={(event) => updateStop(stop.id, { color: event.target.value })} />
						<input aria-label="Stop position" type="range" min="0" max="100" value={stop.position} onChange={(event) => updateStop(stop.id, { position: Number(event.target.value) })} />
						<input aria-label="Stop percentage" type="number" min="0" max="100" value={stop.position} onChange={(event) => updateStop(stop.id, { position: Number(event.target.value) })} />
						<span>%</span>
						<button className="tool-button secondary" type="button" onClick={() => removeStop(stop.id)} disabled={stops.length <= 1}>Remove</button>
					</div>
				))}
			</fieldset>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={addStop} disabled={stops.length >= 12}>Add stop</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!css}>Copy CSS</button>
				<button className="tool-button secondary" type="button" onClick={clear}>Reset</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">The preview and generated CSS run entirely in your browser. Add up to 12 stops and review repeating or radial position settings for browser support.</p>
		</div>
	);
}
