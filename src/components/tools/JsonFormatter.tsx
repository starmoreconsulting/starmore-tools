import { useState } from 'react';
import { transformJson } from '../../engines/json';

export default function JsonFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const transform = (mode: 'format' | 'minify') => {
		try {
			setOutput(transformJson(input, mode));
			setMessage(mode === 'format' ? 'JSON formatted successfully.' : 'JSON minified successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON input.');
			setIsError(true);
		}
	};

	const copyOutput = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('Copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the output instead.');
			setIsError(true);
		}
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="json-input">Input JSON</label>
					<textarea
						id="json-input"
						value={input}
						onChange={(event) => {
							setInput(event.target.value);
							setOutput('');
							setMessage('');
							setIsError(false);
						}}
						placeholder={'{"hello":"world"}'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="json-output">Output</label>
					<pre className="json-output" id="json-output" aria-live="polite">{output || 'Your result will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" onClick={() => transform('format')} disabled={!input.trim()}>Format JSON</button>
				<button className="tool-button" onClick={() => transform('minify')} disabled={!input.trim()}>Minify JSON</button>
				<button className="tool-button secondary" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" onClick={() => { setInput(''); setOutput(''); setMessage(''); setIsError(false); }} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
		</div>
	);
}
