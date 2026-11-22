import { useState } from 'react';
import { formatHtml } from '../../engines/html-formatter';

export default function HtmlFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [indentSize, setIndentSize] = useState(2);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const format = () => {
		try {
			setOutput(formatHtml(input, indentSize));
			setMessage('HTML formatted successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not format this HTML.');
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
				<label htmlFor="html-indent-size">Indent size</label>
				<select id="html-indent-size" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
					<option value="2">2 spaces</option>
					<option value="4">4 spaces</option>
					<option value="8">8 spaces</option>
				</select>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="html-format-input">Input HTML</label>
					<textarea
						id="html-format-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'<main><h1>Hello</h1><p>World</p></main>'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="html-format-output">Formatted HTML</label>
					<pre className="json-output" id="html-format-output" aria-live="polite">{output || 'Your formatted HTML will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={format} disabled={!input.trim()}>Format HTML</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Formatting runs in your browser. This tool preserves tag and attribute text but does not validate HTML against a document standard.</p>
		</div>
	);
}
