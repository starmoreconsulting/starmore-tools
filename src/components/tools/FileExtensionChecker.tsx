import { useState } from 'react';
import { assessFileExtension } from '../../engines/file-extension-checker';

export default function FileExtensionChecker() {
	const [fileName, setFileName] = useState('');
	const assessment = assessFileExtension(fileName);

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="file-extension-name">Filename or file path</label>
				<input
					id="file-extension-name"
					type="text"
					value={fileName}
					onChange={(event) => setFileName(event.target.value)}
					autoComplete="off"
					spellCheck={false}
					placeholder="e.g. report.pdf"
				/>
			</div>
			<div className="calc-result-grid" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">DETECTED EXTENSION</span>
					<strong>{assessment.extension || '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">FILE TYPE</span>
					<strong>{assessment.info?.category ?? (assessment.extension ? 'Unknown' : '—')}</strong>
					{assessment.info && <span>{assessment.info.description}</span>}
				</div>
			</div>
			{assessment.warnings.length > 0 && (
				<ul className="tool-feedback-list" aria-label="Extension notes">
					{assessment.warnings.map((warning) => <li key={warning}>{warning}</li>)}
				</ul>
			)}
			<p className="tool-message" role="status">
				The extension is only a filename label. This tool does not inspect file contents, verify the true file format, or scan for malware.
			</p>
		</div>
	);
}
