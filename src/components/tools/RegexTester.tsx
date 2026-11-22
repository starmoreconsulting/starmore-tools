import { useState } from 'react';
import { testRegex } from '../../engines/regex-tester';

export default function RegexTester() {
	const [pattern, setPattern] = useState('');
	const [flags, setFlags] = useState('g');
	const [text, setText] = useState('');
	const [replacement, setReplacement] = useState('');
	const [showReplacement, setShowReplacement] = useState(false);
	const [message, setMessage] = useState('Enter a pattern and text to test.');
	const [copied, setCopied] = useState(false);
	const result = testRegex({ pattern, flags, text, replacement: showReplacement ? replacement : '' });

	const copy = async (value: string, label: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setMessage(`${label} copied to clipboard.`);
			setCopied(true);
		} catch {
			setMessage('Could not access the clipboard. Select and copy manually instead.');
			setCopied(false);
		}
	};

	const clear = () => {
		setPattern('');
		setFlags('g');
		setText('');
		setReplacement('');
		setShowReplacement(false);
		setMessage('Enter a pattern and text to test.');
		setCopied(false);
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="regex-pattern">Pattern</label>
					<input id="regex-pattern" type="text" value={pattern} onChange={(event) => { setPattern(event.target.value); setCopied(false); }} placeholder="e.g. (\\w+)@(\\w+\\.\\w+)" spellCheck={false} />
				</div>
				<div>
					<label htmlFor="regex-flags">Flags</label>
					<input id="regex-flags" type="text" value={flags} onChange={(event) => { setFlags(event.target.value); setCopied(false); }} placeholder="gim" spellCheck={false} />
				</div>
			</div>
			<div className="duplicate-columns" style={{ marginTop: 14 }}>
				<div>
					<label htmlFor="regex-text">Test text</label>
					<textarea id="regex-text" value={text} onChange={(event) => { setText(event.target.value); setCopied(false); }} placeholder="Paste or type text to test…" spellCheck={false} />
				</div>
				<div>
					<label htmlFor="regex-replacement">Replacement preview</label>
					<textarea id="regex-replacement" value={showReplacement ? result.replaced : ''} readOnly placeholder="Enable replacement preview and enter a replacement below…" spellCheck={false} />
				</div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Replacement</legend>
				<label className="duplicate-option">
					<input type="checkbox" checked={showReplacement} onChange={(event) => setShowReplacement(event.target.checked)} />
					<span>Show replacement preview</span>
				</label>
			</fieldset>
			{showReplacement && (
				<div className="calc-field">
					<label htmlFor="regex-replacement-value">Replacement text</label>
					<input id="regex-replacement-value" type="text" value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="Replacement, e.g. $1 or $&" />
				</div>
			)}
			<div className="stats-row" aria-live="polite">
				<span><strong>{result.count}</strong> matches</span>
				<span><strong>{result.matches.length}</strong> displayed</span>
				</div>
			<div className="regex-match-list" aria-label="Regex matches">
				{result.matches.map((match, index) => (
					<div className="regex-match-row" key={`${match.index}-${index}`}>
						<span><strong>{index + 1}</strong> · {match.index}–{match.end}</span>
						<code>{match.text || '(empty match)'}</code>
						{match.groups.length > 0 && <small>Groups: {match.groups.map((group, groupIndex) => `${groupIndex + 1}: ${group ?? '(undefined)'}`).join(' · ')}</small>}
						{Object.keys(match.namedGroups).length > 0 && <small>Named: {Object.entries(match.namedGroups).map(([name, value]) => `${name}: ${value}`).join(' · ')}</small>}
					</div>
				))}
				{pattern && !result.error && result.matches.length === 0 && <p className="html-formatter-note">No matches found.</p>}
			</div>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={() => copy(pattern, 'Pattern')} disabled={!pattern}>Copy pattern</button>
				<button className="tool-button secondary" type="button" onClick={() => copy(showReplacement ? result.replaced : result.matches.map((match) => match.text).join('\n'), showReplacement ? 'Replacement' : 'Matches')} disabled={!text || result.error !== ''}>Copy {showReplacement ? 'replacement' : 'matches'}</button>
				<button className="tool-button secondary" type="button" onClick={clear} disabled={!pattern && !flags && !text && !replacement}>Clear</button>
			</div>
			<p className={`tool-message${result.error ? ' error' : ''}`} role="status">{result.error || (copied ? message : pattern ? `${result.count} match${result.count === 1 ? '' : 'es'} found locally.` : message)}</p>
			<p className="html-formatter-note">Pattern testing uses your browser JavaScript RegExp engine. It is local and does not send text or patterns anywhere. Supported flags include d, g, i, m, s, u, v, and y where supported by the browser.</p>
		</div>
	);
}
