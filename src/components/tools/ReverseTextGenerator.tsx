import { useState } from 'react';
import { reverseText } from '../../engines/text';

export default function ReverseTextGenerator() {
	const [text, setText] = useState('');
	const [mode, setMode] = useState<'characters' | 'words' | 'lines'>('characters');
	const [message, setMessage] = useState('');
	const output = reverseText(text, mode);

	const copyOutput = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('Reversed text copied to clipboard.');
		} catch {
			setMessage('Could not access the clipboard. Select and copy the result instead.');
		}
	};

	return (
		<div>
			<div className="duplicate-columns">
				<div><label htmlFor="reverse-input">Text to reverse</label><textarea id="reverse-input" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="Enter or paste text..." /></div>
				<div><label htmlFor="reverse-output">Reversed text</label><textarea id="reverse-output" value={output} readOnly placeholder="The reversed text appears here..." /></div>
			</div>
			<fieldset className="duplicate-options"><legend>Reverse by</legend><label className="duplicate-option"><input type="radio" name="reverse-mode" checked={mode === 'characters'} onChange={() => setMode('characters')} /><span>Characters</span></label><label className="duplicate-option"><input type="radio" name="reverse-mode" checked={mode === 'words'} onChange={() => setMode('words')} /><span>Words</span></label><label className="duplicate-option"><input type="radio" name="reverse-mode" checked={mode === 'lines'} onChange={() => setMode('lines')} /><span>Lines</span></label></fieldset>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={copyOutput} disabled={!text}>Copy result</button><button className="tool-button secondary" type="button" onClick={() => { setText(''); setMessage(''); }} disabled={!text}>Clear</button></div>
			<p className="tool-message" role="status">{message || 'Character reversal keeps Unicode characters such as emoji intact.'}</p>
		</div>
	);
}
