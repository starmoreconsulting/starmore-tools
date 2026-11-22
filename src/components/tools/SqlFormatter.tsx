import { useState } from 'react';
import { formatSql, type SqlKeywordCase } from '../../engines/sql-formatter';

export default function SqlFormatter() {
	const [input, setInput] = useState('');
	const [output, setOutput] = useState('');
	const [indentSize, setIndentSize] = useState(2);
	const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>('upper');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const format = () => {
		try {
			setOutput(formatSql(input, indentSize, keywordCase));
			setMessage('SQL formatted successfully.');
			setIsError(false);
		} catch (error) {
			setOutput('');
			setMessage(error instanceof Error ? error.message : 'Could not format this SQL.');
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
			<div className="json-columns">
				<div className="calc-field">
					<label htmlFor="sql-indent-size">Indent size</label>
					<select id="sql-indent-size" value={indentSize} onChange={(event) => setIndentSize(Number(event.target.value))}>
						<option value="2">2 spaces</option>
						<option value="4">4 spaces</option>
						<option value="8">8 spaces</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="sql-keyword-case">Keyword case</label>
					<select id="sql-keyword-case" value={keywordCase} onChange={(event) => setKeywordCase(event.target.value as SqlKeywordCase)}>
						<option value="upper">UPPERCASE</option>
						<option value="lower">lowercase</option>
						<option value="preserve">Preserve input</option>
					</select>
				</div>
			</div>
			<div className="json-columns">
				<div>
					<label htmlFor="sql-format-input">Input SQL</label>
					<textarea id="sql-format-input" value={input} onChange={(event) => updateInput(event.target.value)} placeholder={'select u.id,u.name from users u where u.active=1 order by u.name'} spellCheck={false} />
				</div>
				<div>
					<label htmlFor="sql-format-output">Formatted SQL</label>
					<pre className="json-output" id="sql-format-output" aria-live="polite">{output || 'Your formatted SQL will appear here.'}</pre>
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={format} disabled={!input.trim()}>Format SQL</button>
				<button className="tool-button secondary" type="button" onClick={copyOutput} disabled={!output}>Copy result</button>
				<button className="tool-button secondary" type="button" onClick={() => updateInput('')} disabled={!input && !output}>Clear</button>
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">Formatting runs in your browser. Strings, quoted identifiers, comments, parameters, and bracketed identifiers are kept separate from keyword formatting. This is a lightweight formatter, not a dialect-specific SQL parser or validator.</p>
		</div>
	);
}
