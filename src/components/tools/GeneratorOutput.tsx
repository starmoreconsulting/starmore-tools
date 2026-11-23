import { useState } from 'react';

interface GeneratorOutputProps {
	output: string;
	filename: string;
	emptyText: string;
}

export default function GeneratorOutput({ output, filename, emptyText }: GeneratorOutputProps) {
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(output);
			setMessage('Output copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the output instead.');
			setIsError(true);
		}
	};

	const download = () => {
		try {
			const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = filename;
			anchor.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 1000);
			setMessage(`${filename} downloaded.`);
			setIsError(false);
		} catch {
			setMessage('Could not create a download. Select and copy the output instead.');
			setIsError(true);
		}
	};

	return (
		<div>
			<pre className="json-output">{output || emptyText}</pre>
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!output}>Copy output</button>
				<button className="tool-button secondary" type="button" onClick={download} disabled={!output}>Download {filename}</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
		</div>
	);
}
