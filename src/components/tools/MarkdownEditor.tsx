import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const starterMarkdown = `# Markdown editor

Write Markdown on the left and preview it on the right.

## Formatting

- **Bold** and *italic*
- [Links](https://example.com)
- Lists and headings

\`Code\` is supported too.`;

export default function MarkdownEditor() {
	const [markdown, setMarkdown] = useState(starterMarkdown);
	const [preview, setPreview] = useState('');
	const [message, setMessage] = useState('Markdown is previewed locally. Your text never leaves this device.');

	useEffect(() => {
		const rendered = marked.parse(markdown, { async: false, breaks: true });
		setPreview(DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } }));
	}, [markdown]);

	const download = () => {
		const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'starmore-markdown.md';
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
		setMessage('Markdown file downloaded locally.');
	};

	return (
		<div>
			<div className="markdown-columns">
				<div>
					<label htmlFor="markdown-source">Markdown</label>
					<textarea id="markdown-source" value={markdown} onChange={(event) => { setMarkdown(event.target.value); setMessage('Preview updated locally.'); }} />
				</div>
				<div>
					<label id="markdown-preview-label">Live preview</label>
					<div className="markdown-preview" aria-labelledby="markdown-preview-label" dangerouslySetInnerHTML={{ __html: preview }} />
				</div>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={download}>Download .md</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">Your Markdown text never leaves your device. Preview rendering and HTML sanitization happen locally in this browser.</p>
		</div>
	);
}
