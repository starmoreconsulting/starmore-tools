import { useState } from 'react';
import { minifyCss } from '../../engines/css-minifier';

export default function CssMinifier() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const minify = () => {
		try {
			setOutput(minifyCss(input));
			setMessage('CSS minified successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not minify this CSS.');
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
					<label htmlFor="css-minifier-input">Input CSS</label>
					<textarea
						id="css-minifier-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'.card {\n  color: #333;\n  padding: 1rem;\n}'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="css-minifier-output">Minified CSS</label>
					<pre className="json-output" id="css-minifier-output" aria-live="polite">{output || 'Your minified CSS will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={minify} disabled={!input.trim()}>Minify CSS</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Minification runs locally in your browser. Ordinary comments are removed, important comments and strings are preserved, and other whitespace is collapsed conservatively. This is not a full CSS parser or validator.</p>
		</div>
	);
}
