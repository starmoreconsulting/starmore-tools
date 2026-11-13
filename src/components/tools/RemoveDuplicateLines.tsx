import { useState } from 'react';

function removeDuplicates(text: string, ignoreCase: boolean, trimSpaces: boolean, keepOriginalOrder: boolean) {
	if (text.length === 0) return { lines: [], output: '', removed: 0 };

	const seen = new Set<string>();
	const uniqueLines: string[] = [];

	for (const sourceLine of text.split(/\r\n|[\n\r\u2028\u2029]/)) {
		const line = trimSpaces ? sourceLine.trim() : sourceLine;
		const key = ignoreCase ? line.toLocaleLowerCase() : line;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueLines.push(line);
		}
	}

	if (!keepOriginalOrder) uniqueLines.sort((first, second) => first.localeCompare(second));
	return { lines: uniqueLines, output: uniqueLines.join('\n'), removed: text.length === 0 ? 0 : text.split(/\r\n|[\n\r\u2028\u2029]/).length - uniqueLines.length };
}

export default function RemoveDuplicateLines() {
	const [text, setText] = useState('');
	const [ignoreCase, setIgnoreCase] = useState(false);
	const [trimSpaces, setTrimSpaces] = useState(true);
	const [keepOriginalOrder, setKeepOriginalOrder] = useState(true);
	const [message, setMessage] = useState('');
	const result = removeDuplicates(text, ignoreCase, trimSpaces, keepOriginalOrder);

	const copyResult = async () => {
		try {
			await navigator.clipboard.writeText(result.output);
			setMessage('Cleaned text copied to clipboard.');
		} catch {
			setMessage('Could not access the clipboard. Select and copy the result instead.');
		}
	};

	return (
		<div>
			<div className="duplicate-columns">
				<div>
					<label htmlFor="duplicate-input">Text to clean</label>
					<textarea id="duplicate-input" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="Paste one item per line..." />
				</div>
				<div>
					<label htmlFor="duplicate-output">Unique lines</label>
					<textarea id="duplicate-output" value={result.output} readOnly placeholder="Your unique lines will appear here..." />
				</div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Options</legend>
				<label className="duplicate-option">
					<input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
					<span>Ignore case</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={trimSpaces} onChange={(event) => setTrimSpaces(event.target.checked)} />
					<span>Trim spaces</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={keepOriginalOrder} onChange={(event) => setKeepOriginalOrder(event.target.checked)} />
					<span>Keep original order</span>
				</label>
			</fieldset>
			<div className="stats-row" aria-live="polite">
				<span><strong>{result.lines.length}</strong> unique lines</span>
				<span><strong>{result.removed}</strong> duplicate lines removed</span>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={copyResult} disabled={!text}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => { setText(''); setMessage(''); }} disabled={!text}>Clear</button>
			</div>
			<p className="tool-message" role="status">{message || 'Duplicate matching and ordering run locally in your browser.'}</p>
		</div>
	);
}
