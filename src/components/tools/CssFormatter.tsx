import { useState } from 'react';
import { formatCss } from '../../engines/css-formatter';

export default function CssFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [indentSize, setIndentSize] = useState(2);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const format = () => {
		try {
			setOutput(formatCss(input, indentSize));
			setMessage('CSS formatted successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not format this CSS.');
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

	const updateInput = (value: string) => {
		setInput(value);
		setOutput('');
		setMessage('');
		setIsError(false);
	};

	return (
		<div>
			<div className="calc-field html-indent-control">
				<label htmlFor="css-indent-size">Indent size</label>
				<select id="css-indent-size" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
					<option value="2">2 spaces</option>
					<option value="4">4 spaces</option>
					<option value="8">8 spaces</option>
				</select>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="css-format-input">Input CSS</label>
					<textarea
						id="css-format-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'.card{padding:1rem;color:#333}@media (min-width:600px){.card{padding:2rem}}'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="css-format-output">Formatted CSS</label>
					<pre className="json-output" id="css-format-output" aria-live="polite">{output || 'Your formatted CSS will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={format} disabled={!input.trim()}>Format CSS</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Formatting runs in your browser and preserves strings and comments. This tool is a formatter, not a full CSS parser or validator.</p>
		</div>
	);
}
