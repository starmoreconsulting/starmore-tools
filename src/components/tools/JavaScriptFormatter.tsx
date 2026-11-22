import { useState } from 'react';
import { formatJavaScript } from '../../engines/javascript-formatter';

export default function JavaScriptFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [indentSize, setIndentSize] = useState(2);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const format = () => {
		try {
			setOutput(formatJavaScript(input, indentSize));
			setMessage('JavaScript formatted successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not format this JavaScript.');
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
				<label htmlFor="javascript-indent-size">Indent size</label>
				<select id="javascript-indent-size" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
					<option value="2">2 spaces</option>
					<option value="4">4 spaces</option>
					<option value="8">8 spaces</option>
				</select>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="javascript-format-input">Input JavaScript</label>
					<textarea
						id="javascript-format-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'function greet(name){return `Hello, ${name}!`}'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="javascript-format-output">Formatted JavaScript</label>
					<pre className="json-output" id="javascript-format-output" aria-live="polite">{output || 'Your formatted JavaScript will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={format} disabled={!input.trim()}>Format JavaScript</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Formatting runs locally in your browser and preserves comments and literals. This lightweight formatter is not a full JavaScript parser or validator; review output, especially for code that relies on automatic semicolon insertion.</p>
		</div>
	);
}
