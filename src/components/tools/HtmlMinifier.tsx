import { useState } from 'react';
import { minifyHtml } from '../../engines/html-minifier';

export default function HtmlMinifier() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const minify = () => {
		try {
			const result = minifyHtml(input);
			setOutput(result);
			setMessage('HTML minified successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not minify this HTML.');
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
					<label htmlFor="html-minifier-input">Input HTML</label>
					<textarea
						id="html-minifier-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'<main>\n  <h1>Hello</h1>\n  <p>Welcome to my site.</p>\n</main>'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="html-minifier-output">Minified HTML</label>
					<pre className="json-output" id="html-minifier-output" aria-live="polite">{output || 'Your minified HTML will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={minify} disabled={!input.trim()}>Minify HTML</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Minification runs in your browser. Ordinary comments are removed and text whitespace is collapsed; whitespace in preformatted content and script/style blocks is preserved. This is not a full HTML parser or validator.</p>
		</div>
	);
}
