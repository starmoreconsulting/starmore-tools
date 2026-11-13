import { useState } from 'react';

type Separator = '-' | '_' | ' ';

function toSlug(text: string, separator: Separator) {
	return text
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(/^[-_ ]+|[-_ ]+$/g, '');
}

export default function TextToSlugConverter() {
	const [text, setText] = useState('');
	const [separator, setSeparator] = useState<Separator>('-');
	const [message, setMessage] = useState('');
	const slug = toSlug(text, separator);

	const copySlug = async () => {
		try {
			await navigator.clipboard.writeText(slug);
			setMessage('Slug copied to clipboard.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the slug instead.');
		}
	};

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="slug-source">Text to convert</label>
				<textarea id="slug-source" value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="A title for your page..." />
			</div>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="slug-separator">Word separator</label>
					<select id="slug-separator" value={separator} onChange={(event) => setSeparator(event.target.value as Separator)}>
						<option value="-">Hyphen (-)</option>
						<option value="_">Underscore (_)</option>
						<option value=" ">Space</option>
					</select>
				</div>
			</div>
			<div className="calc-field" style={{ marginTop: 15 }}>
				<label htmlFor="slug-output">Slug</label>
				<textarea id="slug-output" value={slug} readOnly placeholder="Your slug will appear here..." />
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={copySlug} disabled={!slug}>Copy slug</button>
			</div>
			<p className="tool-message" role="status">{message || 'Accents and symbols are removed; the result is lowercase.'}</p>
		</div>
	);
}
