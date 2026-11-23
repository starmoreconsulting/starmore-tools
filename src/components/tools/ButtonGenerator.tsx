import { useState } from 'react';
import { buildButtonCode } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function ButtonGenerator() {
	const [label, setLabel] = useState('Get started');
	const [background, setBackground] = useState('#5b4b8a');
	const [text, setText] = useState('#ffffff');
	const [hoverBackground, setHoverBackground] = useState('#403466');
	const [border, setBorder] = useState('#5b4b8a');
	const [radius, setRadius] = useState(8);
	const [paddingVertical, setPaddingVertical] = useState(12);
	const [paddingHorizontal, setPaddingHorizontal] = useState(24);
	const { css, html } = buildButtonCode({ label, background, text, hoverBackground, border, radius, paddingVertical, paddingHorizontal });
	return (
		<div>
			<div className="json-columns">
				<div><label>Button preview</label><div style={{ minHeight: 128, display: 'grid', placeItems: 'center', background: '#f0f1ec' }}><button type="button" style={{ backgroundColor: background, color: text, border: `1px solid ${border}`, borderRadius: radius, padding: `${paddingVertical}px ${paddingHorizontal}px`, font: 'inherit', cursor: 'pointer' }}>{label || 'Button label'}</button></div></div>
				<div><label>HTML and CSS</label><GeneratorOutput output={`${html}\n\n<style>\n${css}\n</style>`} filename="button.txt" emptyText="" /></div>
			</div>
			<div className="json-columns" style={{ marginTop: 14 }}>
				<div className="calc-field"><label htmlFor="button-label">Button label</label><input id="button-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} /></div>
				{[['background', 'Background', background, setBackground], ['text', 'Text', text, setText], ['hover', 'Hover background', hoverBackground, setHoverBackground], ['border', 'Border', border, setBorder]].map(([id, title, value, setter]) => (
					<div className="calc-field" key={String(id)}><label htmlFor={`button-${id}`}>{String(title)}</label><input id={`button-${id}`} type="color" value={String(value)} onChange={(event) => (setter as (value: string) => void)(event.target.value)} /></div>
				))}
				<div className="calc-field"><label htmlFor="button-radius">Corner radius (px)</label><input id="button-radius" type="number" min="0" max="100" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="button-padding-v">Vertical padding (px)</label><input id="button-padding-v" type="number" min="0" max="100" value={paddingVertical} onChange={(event) => setPaddingVertical(Number(event.target.value))} /></div>
				<div className="calc-field"><label htmlFor="button-padding-h">Horizontal padding (px)</label><input id="button-padding-h" type="number" min="0" max="100" value={paddingHorizontal} onChange={(event) => setPaddingHorizontal(Number(event.target.value))} /></div>
			</div>
			<p className="html-formatter-note">Change the label, colours, corner radius, and padding to generate reusable button markup and CSS. The preview and output stay on this device.</p>
		</div>
	);
}

export default ButtonGenerator;
