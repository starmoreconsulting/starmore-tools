import { useState } from 'react';
import { generateLorem } from '../../engines/lorem';

export default function LoremIpsumGenerator() {
	const [mode, setMode] = useState<'words' | 'sentences' | 'paragraphs'>('paragraphs');
	const [count, setCount] = useState('3');
	const [seed, setSeed] = useState('1');
	const [copyMessage, setCopyMessage] = useState('');

	let output = '';
	let error = '';
	const countValue = Number(count);
	const seedValue = Number(seed);
	try {
		output = generateLorem(mode, countValue, Number.isFinite(seedValue) ? seedValue : 1);
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Unable to generate text.';
	}

	const copyOutput = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setCopyMessage('Lorem ipsum text copied to clipboard.');
		} catch {
			setCopyMessage('Could not access the clipboard. Select and copy the text instead.');
		}
	};

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field"><label htmlFor="lorem-mode">Generate</label><select id="lorem-mode" value={mode} onChange={(event) => { setMode(event.target.value as 'words' | 'sentences' | 'paragraphs'); setCopyMessage(''); }}><option value="words">Words</option><option value="sentences">Sentences</option><option value="paragraphs">Paragraphs</option></select></div>
				<div className="calc-field"><label htmlFor="lorem-count">Count</label><input id="lorem-count" type="number" min="1" max="100" step="1" value={count} onChange={(event) => { setCount(event.target.value); setCopyMessage(''); }} /></div>
				<div className="calc-field"><label htmlFor="lorem-seed">Variation seed</label><input id="lorem-seed" type="number" step="1" value={seed} onChange={(event) => { setSeed(event.target.value); setCopyMessage(''); }} /></div>
			</div>
			<label htmlFor="lorem-output">Generated text</label>
			<textarea id="lorem-output" value={output} readOnly placeholder="Generated placeholder text will appear here..." />
			<div className="tool-actions"><button className="tool-button" type="button" onClick={copyOutput} disabled={Boolean(error)}>Copy text</button><button className="tool-button secondary" type="button" onClick={() => setSeed(String((Number(seed) || 0) + 1))}>New variation</button></div>
			<p className={`tool-message${error ? ' error' : ''}`} role="status">{error || copyMessage || 'Text is generated locally and is not sent to a server.'}</p>
		</div>
	);
}
