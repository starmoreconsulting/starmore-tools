import { useState } from 'react';
import { convertJsonToCsv } from '../../engines/json-to-csv';

function downloadCsv(contents: string): void {
	const url = URL.createObjectURL(new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = 'converted-data.csv';
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function JsonToCsvConverter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [protectFormulas, setProtectFormulas] = useState(true);
	const [message, setMessage] = useState('Paste a JSON array of objects to convert it locally.');
	const [isError, setIsError] = useState(false);

	const convert = () => {
		try {
			const result = convertJsonToCsv(input, protectFormulas);
			setOutput(result.csv);
			setMessage(
				`Converted ${result.records} record${result.records === 1 ? '' : 's'} across ${result.columns} column${result.columns === 1 ? '' : 's'}.`
				+ (result.protectedCells ? ` Protected ${result.protectedCells} formula-like cell${result.protectedCells === 1 ? '' : 's'} with a leading apostrophe.` : ''),
			);
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not convert this JSON.');
			setIsError(true);
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('CSV copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the CSV output instead.');
			setIsError(true);
		}
	};

	return (
		<div>
			<div className="json-columns">
				<div>
					<label htmlFor="json-to-csv-input">Input JSON</label>
					<textarea
						id="json-to-csv-input"
						value={input}
						onChange={(event) => {
							setInput(event.target.value);
							setOutput('');
							setMessage('');
							setIsError(false);
						}}
						placeholder={'[{"name":"Ada","age":36}]'}
						spellCheck={false}
					/>
				</div>
				<div>
					<label htmlFor="json-to-csv-output">Output CSV</label>
					<pre className="json-output" id="json-to-csv-output" aria-live="polite">
						{output || 'Your CSV result will appear here.'}
					</pre>
				</div>
			</div>
			<label className="tool-choice" style={{ marginTop: 16 }}>
				<input
					type="checkbox"
					checked={protectFormulas}
					onChange={(event) => {
						setProtectFormulas(event.target.checked);
						setOutput('');
						setMessage('Settings changed. Convert the JSON again to update the CSV.');
						setIsError(false);
					}}
				/>
				<span>Protect formula-like text for spreadsheet apps</span>
			</label>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={convert} disabled={!input.trim()}>Convert to CSV</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!output}>Copy CSV</button>
				<button className="tool-button secondary" type="button" onClick={() => downloadCsv(output)} disabled={!output}>Download CSV</button>
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
			<p className="tool-message">Columns are collected in first-seen order; missing values are empty. Numbers and booleans become text, null becomes empty, and nested values are JSON-encoded. Processing is local to your browser.</p>
		</div>
	);
}
