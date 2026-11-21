import { useState } from 'react';
import { cleanWhitespace } from '../../engines/text';

export default function RemoveExtraSpaces() {
	const [text, setText] = useState('');
	const [collapseInline, setCollapseInline] = useState(true);
	const [trimLines, setTrimLines] = useState(true);
	const [removeBlankLines, setRemoveBlankLines] = useState(false);
	const [message, setMessage] = useState('');
	const result = cleanWhitespace(text, collapseInline, trimLines, removeBlankLines);

	const copyResult = async () => {
		try {
			await navigator.clipboard.writeText(result.result);
			setMessage('Cleaned text copied to clipboard.');
		} catch {
			setMessage('Could not access the clipboard. Select and copy the result instead.');
		}
	};

	return (
		<div>
			<div className="duplicate-columns">
				<div><label htmlFor="extra-spaces-input">Text to clean</label><textarea id="extra-spaces-input" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="Paste text with extra spaces or blank lines..." /></div>
				<div><label htmlFor="extra-spaces-output">Cleaned text</label><textarea id="extra-spaces-output" value={result.result} readOnly placeholder="Your cleaned text will appear here..." /></div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Options</legend>
				<label className="duplicate-option"><input type="checkbox" checked={collapseInline} onChange={(event) => setCollapseInline(event.target.checked)} /><span>Collapse extra spaces and tabs</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={trimLines} onChange={(event) => setTrimLines(event.target.checked)} /><span>Trim the start and end of each line</span></label>
				<label className="duplicate-option"><input type="checkbox" checked={removeBlankLines} onChange={(event) => setRemoveBlankLines(event.target.checked)} /><span>Remove blank lines</span></label>
			</fieldset>
			<div className="stats-row" aria-live="polite"><span><strong>{text.length}</strong> source characters</span><span><strong>{result.removedBlankLines}</strong> blank lines removed</span></div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={copyResult} disabled={!text}>Copy result</button><button className="tool-button secondary" type="button" onClick={() => { setText(''); setMessage(''); }} disabled={!text}>Clear</button></div>
			<p className="tool-message" role="status">{message || 'Whitespace cleanup runs locally in your browser.'}</p>
		</div>
	);
}
