import { useState } from 'react';
import { buildLinkInBioHtml } from '../../engines/link-in-bio';

interface BioLink {
	label: string;
	url: string;
}

function normalizedUrl(value: string): string | null {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
	} catch {
		return null;
	}
}

export default function LinkInBioCreator() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [links, setLinks] = useState<BioLink[]>([{ label: '', url: '' }]);
	const [message, setMessage] = useState('Your link page is previewed locally. Only HTTP and HTTPS links are clickable.');
	const [error, setError] = useState('');
	const update = (index: number, key: keyof BioLink, value: string) => {
		setLinks((current) => current.map((link, itemIndex) => itemIndex === index ? { ...link, [key]: value } : link));
	};
	let pageHtml = '';
	let pageHtmlError = '';
	try {
		pageHtml = buildLinkInBioHtml(title, description, links);
	} catch (cause) {
		pageHtmlError = cause instanceof Error ? cause.message : 'Correct the link details before generating HTML.';
	}
	const copy = async () => {
		if (!pageHtml) return;
		try {
			await navigator.clipboard.writeText(pageHtml);
			setMessage('Standalone HTML copied to the clipboard.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the HTML source below instead.');
		}
	};
	const download = () => {
		if (!pageHtml) return;
		try {
			const blob = new Blob([pageHtml], { type: 'text/html;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'link-in-bio.html';
			anchor.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 1000);
			setMessage('link-in-bio.html downloaded. Review it and host it on a service you control.');
			setError('');
		} catch (cause) {
			setMessage(cause instanceof Error ? cause.message : 'Could not create the HTML download.');
			setError('download');
		}
	};

	return (
		<section aria-label="Link in bio creator">
			<p>Create a simple link-page draft and preview. Add links you control; this tool does not publish or host a page.</p>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="bio-page-title">Name or page title</label>
					<input id="bio-page-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Alex Morgan" />
				</div>
				<div className="calc-field">
					<label htmlFor="bio-page-description">Short introduction</label>
					<textarea id="bio-page-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What should visitors know about you?" />
				</div>
			</div>
			{links.map((link, index) => (
				<fieldset className="calc-fields" key={index}>
					<legend>Link {index + 1}</legend>
					<div className="calc-field">
						<label htmlFor={`bio-link-label-${index}`}>Link label</label>
						<input id={`bio-link-label-${index}`} value={link.label} onChange={(event) => update(index, 'label', event.target.value)} placeholder="e.g. Latest work" />
					</div>
					<div className="calc-field">
						<label htmlFor={`bio-link-url-${index}`}>URL (HTTP or HTTPS)</label>
						<input id={`bio-link-url-${index}`} type="url" value={link.url} onChange={(event) => update(index, 'url', event.target.value)} placeholder="https://example.com" />
					</div>
					<button className="tool-button secondary" type="button" aria-label={`Remove link ${index + 1}`} onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove link</button>
				</fieldset>
			))}
			<div className="tool-actions">
				<button className="tool-button secondary" type="button" onClick={() => setLinks((current) => [...current, { label: '', url: '' }])}>Add a link</button>
				<button className="tool-button" type="button" onClick={copy} disabled={!pageHtml}>Copy HTML</button>
				<button className="tool-button" type="button" onClick={download} disabled={!pageHtml}>Download HTML</button>
			</div>
			<section aria-label="Link page preview">
				<h2>{title.trim() || 'Your name or brand'}</h2>
				{description.trim() && <p>{description}</p>}
				<ul>
					{links.map((link, index) => {
						const href = normalizedUrl(link.url);
						return <li key={index}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{link.label.trim() || link.url}</a> : <span>{link.label.trim() || 'Untitled link'}{link.url.trim() ? ' — add a valid HTTP(S) URL to enable this link' : ' — add a URL'}</span>}</li>;
					})}
				</ul>
			</section>
			{pageHtml ? <details>
				<summary>Review generated HTML</summary>
				<textarea aria-label="Generated standalone HTML" rows={12} readOnly value={pageHtml} />
			</details> : <p className="tool-message error" role="alert">{pageHtmlError}</p>}
			<p className={`tool-message${error ? ' error' : ''}`} role="status">{message}</p>
		</section>
	);
}
