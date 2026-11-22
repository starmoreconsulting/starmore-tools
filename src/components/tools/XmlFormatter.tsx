import { useState } from 'react';
import { formatXml } from '../../engines/xml-formatter';

export default function XmlFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [indentSize, setIndentSize] = useState(2);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const format = () => {
		try {
			setOutput(formatXml(input, indentSize));
			setMessage('XML formatted successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not format this XML.');
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
				<label htmlFor="xml-indent-size">Indent size</label>
				<select id="xml-indent-size" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
					<option value="2">2 spaces</option>
					<option value="4">4 spaces</option>
					<option value="8">8 spaces</option>
				</select>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="xml-format-input">Input XML</label>
					<textarea
						id="xml-format-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={'<?xml version="1.0"?><root><item id="1">Hello</item></root>'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="xml-format-output">Formatted XML</label>
					<pre className="json-output" id="xml-format-output" aria-live="polite">{output || 'Your formatted XML will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={format} disabled={!input.trim()}>Format XML</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Formatting runs in your browser. This lightweight formatter validates tag balance and quoted attributes, but does not enforce an XML schema or DTD.</p>
		</div>
	);
}
