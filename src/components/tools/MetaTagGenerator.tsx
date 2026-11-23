import { useState } from 'react';
import { buildMetaTags } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function MetaTagGenerator() {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [keywords, setKeywords] = useState('');
	const [author, setAuthor] = useState('');
	const [canonicalUrl, setCanonicalUrl] = useState('');
	const [robots, setRobots] = useState('index, follow');
	let output = '';
	let error = '';
	try {
		if ([title, description, keywords, author, canonicalUrl, robots].some((value) => value.trim())) {
			output = buildMetaTags({ title, description, keywords, author, canonicalUrl, robots });
		}
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Check the metadata values.';
	}
	return (
		<div>
			<div className="json-columns">
				<div className="calc-field"><label htmlFor="meta-title">Page title</label><input id="meta-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} /><small>Appears in browser tabs and search results.</small></div>
				<div className="calc-field"><label htmlFor="meta-description">Description</label><textarea id="meta-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} /><small>A short summary for search previews.</small></div>
				<div className="calc-field"><label htmlFor="meta-keywords">Keywords (optional)</label><input id="meta-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="design, web, tools" /></div>
				<div className="calc-field"><label htmlFor="meta-author">Author (optional)</label><input id="meta-author" value={author} onChange={(event) => setAuthor(event.target.value)} /></div>
				<div className="calc-field"><label htmlFor="meta-canonical">Canonical URL (optional)</label><input id="meta-canonical" type="url" value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="https://example.com/page" /></div>
				<div className="calc-field"><label htmlFor="meta-robots">Robots directives (optional)</label><input id="meta-robots" value={robots} onChange={(event) => setRobots(event.target.value)} placeholder="index, follow" /><small>Common values: index, noindex, follow, nofollow.</small></div>
			</div>
			{error && <p className="tool-message error" role="alert">{error}</p>}
			<div style={{ marginTop: 16 }}><label>Generated HTML</label><GeneratorOutput output={output} filename="meta-tags.html" emptyText="Enter one or more metadata values to generate tags." /></div>
			<p className="html-formatter-note">Copy the generated tags into the document’s &lt;head&gt;. Empty fields are omitted. Use a canonical URL only when it is the preferred public address of this page.</p>
		</div>
	);
}

export default MetaTagGenerator;
