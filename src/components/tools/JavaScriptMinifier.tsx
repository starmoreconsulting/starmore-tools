import { useState } from 'react';
import { minifyJavaScript } from '../../engines/javascript-minifier';

export default function JavaScriptMinifier() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const minify = () => {
		try {
			setOutput(minifyJavaScript(input));
			setMessage('JavaScript minified successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not minify this JavaScript.');
			setIsError(true);
		}
	};

	const updateInput = (value: string) => {
		setInput(value);
		setOutput('');
		setMessage('');
		setIsError(false);
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
					<label htmlFor="javascript-minifier-input">Input JavaScript</label>
					<textarea
						id="javascript-minifier-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'function greet(name) {\n  return `Hello, ${name}!`;\n}'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="javascript-minifier-output">Minified JavaScript</label>
					<pre className="json-output" id="javascript-minifier-output" aria-live="polite">{output || 'Your minified JavaScript will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={minify} disabled={!input.trim()}>Minify JavaScript</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Minification runs locally in your browser. Ordinary comments are removed, license comments and literals are preserved, and original line breaks are kept to help protect automatic semicolon insertion. This is not a full JavaScript parser or validator.</p>
		</div>
	);
}
