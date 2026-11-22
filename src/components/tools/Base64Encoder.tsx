import { useState } from 'react';
import { transformBase64 } from '../../engines/base64';

export default function Base64Encoder() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const transform = (action: 'encode' | 'decode') => {
		try {
			setOutput(transformBase64(input, action));
			setMessage(action === 'encode' ? 'Text encoded successfully.' : 'Base64 decoded successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not transform this Base64 text.');
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
					<label htmlFor="base64-input">Input text or Base64</label>
					<textarea
						id="base64-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder="Enter UTF-8 text to encode, or Base64 to decode"
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="base64-output">Result</label>
					<pre className="json-output" id="base64-output" aria-live="polite">{output || 'Your encoded or decoded result will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => transform('encode')} disabled={!input}>Encode</button>
				<button className="tool-button" type="button" onClick={() => transform('decode')} disabled={!input}>Decode</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Text is encoded as UTF-8 and processed locally in your browser. The decoder accepts standard Base64 with optional padding and ASCII whitespace, and reports invalid Base64 or invalid UTF-8 text.</p>
		</div>
	);
}
