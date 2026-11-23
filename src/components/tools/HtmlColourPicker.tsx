import { useState } from 'react';
import { convertCssColor } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function HtmlColourPicker() {
	const [color, setColor] = useState('#5b4b8a');
	const [hexDraft, setHexDraft] = useState('#5b4b8a');
	const formats = Object.entries(convertCssColor(color)).map(([format, value]) => `${format}: ${value}`).join('\n');
	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="html-colour-picker">Choose a colour</label>
					<input id="html-colour-picker" type="color" value={color} onChange={(event) => { setColor(event.target.value); setHexDraft(event.target.value); }} />
					<label htmlFor="html-colour-hex" style={{ marginTop: 12 }}>Hex value</label>
					<input id="html-colour-hex" value={hexDraft} onChange={(event) => {
						const value = event.target.value;
						setHexDraft(value);
						if (/^#[\da-f]{6}$/i.test(value)) setColor(value);
					}} aria-describedby="html-colour-picker-help" aria-invalid={hexDraft !== color} />
					<p id="html-colour-picker-help" className="html-formatter-note">{hexDraft !== color ? 'Enter a complete 6-digit hex colour, for example #336699.' : 'Use the native colour chooser or copy the generated CSS formats. The picker produces opaque 6-digit hex colours.'}</p>
				</div>
				<div><label>Colour preview</label><div style={{ height: 110, borderRadius: 6, background: color }} aria-label={`Selected colour ${color}`} /><label style={{ marginTop: 12 }}>Colour codes</label><GeneratorOutput output={formats} filename="colour-codes.txt" emptyText="" /></div>
			</div>
		</div>
	);
}

export default HtmlColourPicker;
