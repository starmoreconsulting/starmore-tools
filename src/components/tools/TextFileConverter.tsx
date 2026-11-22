import { useState } from 'react';
import { triggerDownload } from '../../engines/pdf';
import {
	convertTextFile,
	detectTextFileFormat,
	getTextFileExtension,
	TEXT_FILE_CONVERTER_MAX_BYTES,
	type TextFileFormat,
} from '../../engines/text-file-converter';

const formatLabels: Record<TextFileFormat, string> = {
	text: 'Plain text (.txt)',
	markdown: 'Markdown (.md)',
	html: 'HTML (.html)',
};

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Could not convert this text file.';
}

export default function TextFileConverter() {
	const [source, setSource] = useState('');
	const [sourceFormat, setSourceFormat] = useState<TextFileFormat>('text');
	const [targetFormat, setTargetFormat] = useState<TextFileFormat>('markdown');
	const [output, setOutput] = useState('');
	const [baseName, setBaseName] = useState('converted-text');
	const [hasConverted, setHasConverted] = useState(false);
	const [message, setMessage] = useState('Paste text or choose a .txt, .md, or .html file to begin.');
	const [isError, setIsError] = useState(false);
	const [busy, setBusy] = useState(false);

	const loadFile = async (file?: File) => {
		if (!file) return;
		const detectedFormat = detectTextFileFormat(file.name);
		if (!detectedFormat) {
			setMessage('Choose a .txt, .md, .markdown, .html, or .htm file.');
			setIsError(true);
			return;
		}
		if (file.size > TEXT_FILE_CONVERTER_MAX_BYTES) {
			setMessage('This file exceeds the 5 MB limit. Choose a smaller text file.');
			setIsError(true);
			return;
		}

		setBusy(true);
		setIsError(false);
		try {
			const text = await file.text();
			setSource(text);
			setSourceFormat(detectedFormat);
			setOutput('');
			setHasConverted(false);
			setBaseName(file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'converted-text');
			setMessage(`Loaded ${file.name} locally. Choose a target format and convert.`);
		} catch (error) {
			setMessage(`Could not read the selected file. ${getErrorMessage(error)}`);
			setIsError(true);
		} finally {
			setBusy(false);
		}
	};

	const convert = () => {
		setIsError(false);
		try {
			setOutput(convertTextFile(source, sourceFormat, targetFormat));
			setHasConverted(true);
			setMessage(`Converted ${formatLabels[sourceFormat]} to ${formatLabels[targetFormat]}.`);
		} catch (error) {
			setOutput('');
			setHasConverted(false);
			setMessage(getErrorMessage(error));
			setIsError(true);
		}
	};

	const download = () => {
		if (!hasConverted) return;
		const extension = getTextFileExtension(targetFormat);
		const mimeType = targetFormat === 'html' ? 'text/html' : targetFormat === 'markdown' ? 'text/markdown' : 'text/plain';
		triggerDownload(
			new Blob([output], { type: `${mimeType};charset=utf-8` }),
			`${baseName}.${extension}`,
		);
		setMessage(`Downloaded ${baseName}.${extension} locally.`);
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="text-file-converter-file">Open a text file (maximum 5 MB)</label>
				<input
					id="text-file-converter-file"
					type="file"
					accept=".txt,.text,.md,.markdown,.mdown,.html,.htm,text/plain,text/markdown,text/html"
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];
						event.currentTarget.value = '';
						void loadFile(file);
					}}
					disabled={busy}
				/>
			</div>
			<div className="text-converter-options">
				<div className="calc-field">
					<label htmlFor="text-file-converter-source-format">Source format</label>
					<select id="text-file-converter-source-format" value={sourceFormat} onChange={(event) => { setSourceFormat(event.target.value as TextFileFormat); setHasConverted(false); }}>
						{Object.entries(formatLabels).map(([format, label]) => <option key={format} value={format}>{label}</option>)}
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="text-file-converter-target-format">Convert to</label>
					<select id="text-file-converter-target-format" value={targetFormat} onChange={(event) => { setTargetFormat(event.target.value as TextFileFormat); setHasConverted(false); }}>
						{Object.entries(formatLabels).map(([format, label]) => <option key={format} value={format}>{label}</option>)}
					</select>
				</div>
			</div>
			<div className="calc-field">
				<label htmlFor="text-file-converter-source">Source text</label>
				<textarea
					id="text-file-converter-source"
					value={source}
					onChange={(event) => { setSource(event.target.value); setHasConverted(false); }}
					rows={10}
					spellCheck={false}
					placeholder="Paste plain text, Markdown, or HTML here…"
					disabled={busy}
				/>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={convert} disabled={busy}>Convert</button>
				<button className="tool-button secondary" type="button" onClick={download} disabled={!hasConverted || busy}>Download {getTextFileExtension(targetFormat)}</button>
			</div>
			{hasConverted && (
				<div className="calc-field">
					<label htmlFor="text-file-converter-output">Converted output</label>
					<textarea id="text-file-converter-output" value={output} readOnly rows={10} spellCheck={false} />
				</div>
			)}
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="tool-message">Converts between plain text, Markdown, and HTML in your browser. Markdown-to-HTML output is sanitized; HTML-to-Markdown conversion may not preserve every style or layout. Files are not uploaded.</p>
		</div>
	);
}
