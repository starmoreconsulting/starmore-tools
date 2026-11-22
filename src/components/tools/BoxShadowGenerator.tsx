import { useState } from 'react';
import { buildBoxShadowCss } from '../../engines/box-shadow';

interface ShadowControlProps {
	id: string;
	label: string;
	value: number;
	minimum: number;
	maximum: number;
	unit?: string;
	onChange: (value: number) => void;
}

function ShadowControl({ id, label, value, minimum, maximum, unit = 'px', onChange }: ShadowControlProps) {
	return (
		<div className="box-shadow-control">
			<label htmlFor={id}>{label}</label>
			<div>
				<input id={`${id}-range`} type="range" min={minimum} max={maximum} value={value} onChange={(event) => onChange(Number(event.target.value))} />
				<input id={id} type="number" min={minimum} max={maximum} value={value} onChange={(event) => onChange(Number(event.target.value))} />
				<span>{unit}</span>
			</div>
		</div>
	);
}

export default function BoxShadowGenerator() {
	const [horizontal, setHorizontal] = useState(12);
	const [vertical, setVertical] = useState(12);
	const [blur, setBlur] = useState(24);
	const [spread, setSpread] = useState(0);
	const [color, setColor] = useState('#263238');
	const [opacity, setOpacity] = useState(25);
	const [inset, setInset] = useState(false);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const css = buildBoxShadowCss({ horizontal, vertical, blur, spread, color, opacity, inset });

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(`box-shadow: ${css};`);
			setMessage('CSS copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the CSS instead.');
			setIsError(true);
		}
	};

	const reset = () => {
		setHorizontal(12);
		setVertical(12);
		setBlur(24);
		setSpread(0);
		setColor('#263238');
		setOpacity(25);
		setInset(false);
		setMessage('');
		setIsError(false);
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label>Shadow preview</label>
					<div className="box-shadow-preview-stage">
						<div className="box-shadow-preview-card" style={{ boxShadow: css }} aria-label="Box shadow preview" />
					</div>
				</div>
				<div>
					<label htmlFor="box-shadow-css-output">CSS output</label>
					<pre className="json-output" id="box-shadow-css-output">{`box-shadow: ${css};`}</pre>
				</div>
			</div>
			<div className="box-shadow-controls">
				<ShadowControl id="shadow-horizontal" label="Horizontal offset" value={horizontal} minimum={-100} maximum={100} onChange={setHorizontal} />
				<ShadowControl id="shadow-vertical" label="Vertical offset" value={vertical} minimum={-100} maximum={100} onChange={setVertical} />
				<ShadowControl id="shadow-blur" label="Blur radius" value={blur} minimum={0} maximum={100} onChange={setBlur} />
				<ShadowControl id="shadow-spread" label="Spread radius" value={spread} minimum={-100} maximum={100} onChange={setSpread} />
				<div className="box-shadow-control">
					<label htmlFor="shadow-color">Shadow colour</label>
					<div><input id="shadow-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></div>
				</div>
				<ShadowControl id="shadow-opacity" label="Opacity" value={opacity} minimum={0} maximum={100} unit="%" onChange={setOpacity} />
			</div>
			<label className="tool-choice" style={{ marginTop: 12 }}>
				<input id="shadow-inset" type="checkbox" checked={inset} onChange={(event) => setInset(event.target.checked)} />
				<span>Inset shadow</span>
			</label>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={copy}>Copy CSS</button>
				<button className="tool-button secondary" type="button" onClick={reset}>Reset</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">The preview and CSS are generated locally in your browser. Negative horizontal/vertical offsets move the shadow left/up, and inset shadows render inside the element.</p>
		</div>
	);
}
