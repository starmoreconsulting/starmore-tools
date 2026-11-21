import { useState } from 'react';
import { formatText, type FormatMode } from '../../engines/text-formatter';

export default function TextFormatter() {
	const [text, setText] = useState('');
	const [mode, setMode] = useState<FormatMode>('plain');
	const [lineLength, setLineLength] = useState('80');
	const [message, setMessage] = useState('');
	const output = formatText(text, mode, Number(lineLength));

	const copyOutput = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('Formatted text copied to clipboard.');
		} catch {
			setMessage('Could not access the clipboard. Select and copy the result instead.');
		}
	};

	return (
		<div>
			<div className="duplicate-columns">
				<div><label htmlFor="text-format-input">Text to format</label><textarea id="text-format-input" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="Paste text to format..." /></div>
				<div><label htmlFor="text-format-output">Formatted text</label><textarea id="text-format-output" value={output} readOnly placeholder="Formatted text appears here..." /></div>
			</div>
			<fieldset className="duplicate-options"><legend>Format mode</legend><label className="duplicate-option"><input type="radio" name="text-format-mode" checked={mode === 'plain'} onChange={() => setMode('plain')} /><span>Clean paragraphs</span></label><label className="duplicate-option"><input type="radio" name="text-format-mode" checked={mode === 'paragraphs'} onChange={() => setMode('paragraphs')} /><span>Wrap paragraphs</span></label><label className="duplicate-option"><input type="radio" name="text-format-mode" checked={mode === 'single-line'} onChange={() => setMode('single-line')} /><span>Single line</span></label></fieldset>
			{mode === 'paragraphs' && <div className="calc-field"><label htmlFor="text-format-line-length">Line length</label><input id="text-format-line-length" type="number" min="12" max="200" value={lineLength} onChange={(event) => setLineLength(event.target.value)} /></div>}
			<div className="tool-actions"><button className="tool-button" type="button" onClick={copyOutput} disabled={!text}>Copy result</button><button className="tool-button secondary" type="button" onClick={() => { setText(''); setMessage(''); }} disabled={!text}>Clear</button></div>
			<p className="tool-message" role="status">{message || 'Formatting runs locally in your browser.'}</p>
		</div>
	);
}
