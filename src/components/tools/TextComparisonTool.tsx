import { useState } from 'react';
import { compareTextLines } from '../../engines/text-comparison';

export default function TextComparisonTool() {
	const [left, setLeft] = useState('');
	const [right, setRight] = useState('');
	const [message, setMessage] = useState('');
	const result = compareTextLines(left, right);

	return (
		<div>
			<div className="duplicate-columns">
				<div><label htmlFor="text-comparison-left">Original text</label><textarea id="text-comparison-left" value={left} onChange={(event) => { setLeft(event.target.value); setMessage(''); }} placeholder="Paste the original text..." /></div>
				<div><label htmlFor="text-comparison-right">Changed text</label><textarea id="text-comparison-right" value={right} onChange={(event) => { setRight(event.target.value); setMessage(''); }} placeholder="Paste the changed text..." /></div>
			</div>
			<div className="stats-row" aria-live="polite"><span><strong>{result.unchanged}</strong> unchanged</span><span><strong>{result.removed}</strong> removed</span><span><strong>{result.added}</strong> added</span></div>
			<div className="text-comparison-output" aria-label="Line comparison"><div><strong>Original</strong></div><div><strong>Changed</strong></div>{result.diff.map((line, index) => [
				<div key={`left-${index}`} className={`text-diff-line ${line.kind === 'removed' ? 'removed' : ''}`}>{line.left ?? ''}</div>,
				<div key={`right-${index}`} className={`text-diff-line ${line.kind === 'added' ? 'added' : ''}`}>{line.right ?? ''}</div>,
			])}</div>
			<div className="tool-actions"><button className="tool-button secondary" type="button" onClick={() => { setLeft(''); setRight(''); setMessage(''); }} disabled={!left && !right}>Clear both</button></div>
			<p className="tool-message" role="status">{message || 'Comparison uses a local line-by-line diff.'}</p>
		</div>
	);
}
