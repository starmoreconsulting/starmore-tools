import { useState } from 'react';
import { replaceText } from '../../engines/text';

export default function FindReplaceText() {
	const [text, setText] = useState('');
	const [find, setFind] = useState('');
	const [replacement, setReplacement] = useState('');
	const [matchCase, setMatchCase] = useState(false);
	const [wholeWord, setWholeWord] = useState(false);
	const [regexMode, setRegexMode] = useState(false);
	const [message, setMessage] = useState('');
	const result = replaceText(text, find, replacement, matchCase, wholeWord, regexMode);

	const copyResult = async () => {
		try {
			await navigator.clipboard.writeText(result.result);
			setMessage('Result copied to clipboard.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the result instead.');
		}
	};

	return (
		<div>
			<div className="duplicate-columns">
				<div>
					<label htmlFor="find-replace-input">Text to edit</label>
					<textarea id="find-replace-input" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="Paste or type your text..." />
				</div>
				<div>
					<label htmlFor="find-replace-output">Result</label>
					<textarea id="find-replace-output" value={result.result} readOnly placeholder="The updated text will appear here..." />
				</div>
			</div>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="find-replace-find">{regexMode ? 'Pattern to find' : 'Text to find'}</label>
					<input id="find-replace-find" type="text" value={find} onChange={(event) => { setFind(event.target.value); setMessage(''); }} placeholder={regexMode ? '\\bword\\b' : 'Find...'} />
				</div>
				<div className="calc-field">
					<label htmlFor="find-replace-replacement">Replace with</label>
					<input id="find-replace-replacement" type="text" value={replacement} onChange={(event) => { setReplacement(event.target.value); setMessage(''); }} placeholder="Replacement..." />
				</div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Options</legend>
				<label className="duplicate-option">
					<input type="checkbox" checked={matchCase} onChange={(event) => setMatchCase(event.target.checked)} />
					<span>Match case</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={wholeWord} onChange={(event) => setWholeWord(event.target.checked)} />
					<span>Whole word</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={regexMode} onChange={(event) => { setRegexMode(event.target.checked); setMessage(''); }} />
					<span>Regular expression</span>
				</label>
			</fieldset>
			<div className="stats-row" aria-live="polite">
				<span><strong>{result.count}</strong> replacements</span>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={copyResult} disabled={text.length === 0 || result.error !== ''}>Copy result</button>
			</div>
			<p className={`tool-message${result.error ? ' error' : ''}`} role="status">{result.error || message || 'Find and replace runs locally in your browser.'}</p>
		</div>
	);
}
