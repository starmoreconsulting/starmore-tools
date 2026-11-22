import { useState } from 'react';
import { transformUrlText, type UrlEncodingMode } from '../../engines/url-encoder';

export default function UrlEncoder() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [mode, setMode] = useState<UrlEncodingMode>('component');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const transform = (action: 'encode' | 'decode') => {
		try {
			setOutput(transformUrlText(input, action, mode));
			setMessage(action === 'encode' ? 'Text encoded successfully.' : 'Text decoded successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not transform this URL text.');
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
			<div className="calc-field">
				<label htmlFor="url-encoding-mode">Encoding mode</label>
				<select id="url-encoding-mode" value={mode} onChange={(event) => {
					setMode(event.target.value as UrlEncodingMode);
					setOutput('');
					setMessage('');
					setIsError(false);
				}}>
					<option value="component">URL component (query value or path segment)</option>
					<option value="url">Full URL (preserve URL delimiters)</option>
				</select>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="url-encoder-input">Input text</label>
					<textarea
						id="url-encoder-input"
						value={input}
						onChange={(event) => updateInput(event.target.value)}
						placeholder={mode === 'url' ? 'https://example.com/search?q=hello world' : 'hello world & more'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="url-encoder-output">Result</label>
					<pre className="json-output" id="url-encoder-output" aria-live="polite">{output || 'Your encoded or decoded result will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={() => transform('encode')} disabled={!input}>Encode</button>
				<button className="tool-button" type="button" onClick={() => transform('decode')} disabled={!input}>Decode</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Choose component mode for individual parameter values or path segments; choose full URL to preserve URL separators. Decoding uses standard percent-encoding rules and does not treat “+” as a space. Processing stays in your browser.</p>
		</div>
	);
}
