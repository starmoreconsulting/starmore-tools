import { useState } from 'react';
import { buildOpenGraphTags } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function OpenGraphPreviewGenerator() {
	const [title, setTitle] = useState('A page worth sharing');
	const [description, setDescription] = useState('Add a concise summary to show what this page is about.');
	const [imageUrl, setImageUrl] = useState('');
	const [pageUrl, setPageUrl] = useState('');
	const [siteName, setSiteName] = useState('');
	const [type, setType] = useState('website');
	let output = '';
	let error = '';
	try {
		output = buildOpenGraphTags({ title, description, imageUrl, pageUrl, siteName, type });
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Check the Open Graph values.';
	}
	return (
		<div>
			<div className="json-columns">
				<div>
					<div className="calc-field"><label htmlFor="og-title">Title</label><input id="og-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} /></div>
					<div className="calc-field"><label htmlFor="og-description">Description</label><textarea id="og-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} /></div>
					<div className="calc-field"><label htmlFor="og-image">Image URL (optional)</label><input id="og-image" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/share-image.jpg" /><small>Preview does not fetch or load this image.</small></div>
					<div className="calc-field"><label htmlFor="og-url">Page URL (optional)</label><input id="og-url" type="url" value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} placeholder="https://example.com/page" /></div>
					<div className="calc-field"><label htmlFor="og-site-name">Site name (optional)</label><input id="og-site-name" value={siteName} onChange={(event) => setSiteName(event.target.value)} /></div>
					<div className="calc-field"><label htmlFor="og-type">Content type</label><select id="og-type" value={type} onChange={(event) => setType(event.target.value)}><option value="website">Website</option><option value="article">Article</option><option value="product">Product</option><option value="profile">Profile</option></select></div>
				</div>
				<div>
					<label>Social preview</label>
					<div style={{ maxWidth: 500, border: '1px solid #d5d8d0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
						{imageUrl && /^https?:\/\//i.test(imageUrl) ? <div style={{ height: 190, background: '#e9e9e2', display: 'grid', placeItems: 'center', color: '#555', textAlign: 'center', padding: 12 }}>Image URL set. It is not fetched in this local preview.</div> : <div style={{ height: 190, background: '#e9e9e2', display: 'grid', placeItems: 'center', color: '#555' }}>No image URL</div>}
						<div style={{ padding: 14 }}><strong>{title || 'Your page title'}</strong><p style={{ margin: '8px 0', color: '#555' }}>{description || 'Your page description'}</p><small>{siteName || pageUrl || 'Site name or page URL'}</small></div>
					</div>
					<p className="html-formatter-note">Social platforms may display cards differently and cache old metadata. This is an illustrative preview, not a platform-specific guarantee.</p>
				</div>
			</div>
			{error && <p className="tool-message error" role="alert">{error}</p>}
			<div style={{ marginTop: 16 }}><label>Open Graph meta tags</label><GeneratorOutput output={output} filename="open-graph-tags.html" emptyText="Enter a title to generate Open Graph tags." /></div>
			<p className="html-formatter-note">Add these tags to the page’s &lt;head&gt;. URLs must be absolute http:// or https:// addresses. No remote image or page request is made by this tool.</p>
		</div>
	);
}

export default OpenGraphPreviewGenerator;
