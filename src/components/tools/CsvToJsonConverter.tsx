import { useState } from 'react';
import { convertCsvToJson } from '../../engines/csv-to-json';

function downloadJson(contents: string): void {
	const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = 'converted-data.json';
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CsvToJsonConverter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [message, setMessage] = useState('Paste CSV data with a header row to convert it locally.');
	const [isError, setIsError] = useState(false);

	const convert = () => {
		try {
			setOutput(convertCsvToJson(input));
			setMessage('CSV converted to JSON successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not convert this CSV.');
			setIsError(true);
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('JSON copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the JSON output instead.');
			setIsError(true);
		}
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="csv-to-json-input">Input CSV</label>
					<textarea
						id="csv-to-json-input"
						value={input}
						onChange={(event) => {
							setInput(event.target.value);
							setOutput('');
							setMessage('');
							setIsError(false);
						}}
						placeholder={'name,age\nAda,36'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="csv-to-json-output">Output JSON</label>
					<pre className="json-output" id="csv-to-json-output" aria-live="polite">
						{output || 'Your JSON result will appear here.'}
					</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={convert} disabled={!input.trim()}>Convert to JSON</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!output}>Copy JSON</button>
				<button className="tool-button secondary" type="button" onClick={() => downloadJson(output)} disabled={!output}>Download JSON</button>
				<button
					className="tool-button secondary"
					type="button"
					onClick={() => { setInput(''); setOutput(''); setMessage(''); setIsError(false); }}
					disabled={!input && !output}
				>
					Clear
				</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">The first row is used for unique, non-empty object keys. Values remain strings; CSV and JSON are processed locally and not uploaded.</p>
		</div>
	);
}
