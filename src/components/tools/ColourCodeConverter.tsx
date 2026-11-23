import { useState } from 'react';
import { convertCssColor } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function ColourCodeConverter() {
	const [input, setInput] = useState('#5b4b8a');
	let output = '';
	let error = '';
	try {
		output = Object.entries(convertCssColor(input)).map(([format, value]) => `${format}: ${value}`).join('\n');
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Enter a supported CSS colour.';
	}
	return (
		<div>
			<div className="json-columns">
				<div><label htmlFor="colour-code-input">CSS colour</label><input id="colour-code-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="#336699 or hsl(210 50% 40%)" spellCheck={false} /><p className="html-formatter-note">Accepts 3/4/6/8-digit hex plus rgb(), rgba(), hsl(), and hsla() forms, including percentage channels and modern slash alpha.</p></div>
				<div><label>Converted values</label><GeneratorOutput output={output} filename="colour-formats.txt" emptyText="Enter a valid CSS colour to see conversions." /></div>
			</div>
			{error && <p className="tool-message error" role="alert">{error}</p>}
			{output && <div style={{ marginTop: 10, height: 42, borderRadius: 6, background: convertCssColor(input).HEX }} aria-label="Colour preview" />}
		</div>
	);
}

export default ColourCodeConverter;
