import { useState } from 'react';
import { buildSitemapXml, type SitemapEntry } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

interface SitemapRow extends SitemapEntry {
	id: number;
}

let nextSitemapRowId = 2;

export function XmlSitemapGenerator() {
	const [entries, setEntries] = useState<SitemapRow[]>([{ id: 1, url: 'https://example.com/' }]);
	let output = '';
	let error = '';
	try {
		if (entries.some((entry) => entry.url.trim())) output = buildSitemapXml(entries);
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Check the sitemap entries.';
	}
	const updateEntry = (id: number, patch: Partial<SitemapRow>) => setEntries((previous) => previous.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
	const addEntry = () => {
		if (entries.length >= 100) return;
		setEntries((previous) => [...previous, { id: nextSitemapRowId++, url: '' }]);
	};
	return (
		<div>
			<p className="html-formatter-note">Add absolute page URLs and optional last-modified dates, change frequency, and priority. A sitemap describes public URLs; it does not guarantee that search engines will index them.</p>
			{entries.map((entry, index) => (
				<fieldset className="duplicate-options" key={entry.id}>
					<legend>Page {index + 1}</legend>
					<div className="json-columns">
						<div className="calc-field"><label htmlFor={`sitemap-url-${entry.id}`}>Page URL</label><input id={`sitemap-url-${entry.id}`} type="url" value={entry.url} onChange={(event) => updateEntry(entry.id, { url: event.target.value })} placeholder="https://example.com/page" /></div>
						<div className="calc-field"><label htmlFor={`sitemap-date-${entry.id}`}>Last modified (optional)</label><input id={`sitemap-date-${entry.id}`} type="date" value={entry.lastModified || ''} onChange={(event) => updateEntry(entry.id, { lastModified: event.target.value })} /></div>
						<div className="calc-field"><label htmlFor={`sitemap-frequency-${entry.id}`}>Change frequency (optional)</label><select id={`sitemap-frequency-${entry.id}`} value={entry.changeFrequency || ''} onChange={(event) => updateEntry(entry.id, { changeFrequency: event.target.value })}><option value="">Not specified</option>{['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'].map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</select></div>
						<div className="calc-field"><label htmlFor={`sitemap-priority-${entry.id}`}>Priority (optional)</label><input id={`sitemap-priority-${entry.id}`} type="number" min="0" max="1" step="0.1" value={entry.priority || ''} onChange={(event) => updateEntry(entry.id, { priority: event.target.value })} placeholder="0.5" /></div>
					</div>
					<button className="tool-button secondary" type="button" onClick={() => setEntries((previous) => previous.length > 1 ? previous.filter((item) => item.id !== entry.id) : previous)} disabled={entries.length <= 1}>Remove page</button>
				</fieldset>
			))}
			<div className="tool-actions"><button className="tool-button" type="button" onClick={addEntry} disabled={entries.length >= 100}>Add page</button></div>
			{error && <p className="tool-message error" role="alert">{error}</p>}
			<div style={{ marginTop: 12 }}><label>XML sitemap</label><GeneratorOutput output={output} filename="sitemap.xml" emptyText="Add a valid page URL to generate the sitemap." /></div>
			<p className="html-formatter-note">The XML is generated locally and escaped for safe markup. Keep entries within your sitemap and hosting limits; this generator supports up to 100 URLs per file and does not create sitemap indexes.</p>
		</div>
	);
}

export default XmlSitemapGenerator;
