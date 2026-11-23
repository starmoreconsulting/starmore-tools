import { useState } from 'react';
import { buildRobotsTxt } from '../../engines/web-generators';
import GeneratorOutput from './GeneratorOutput';

export function RobotsTxtGenerator() {
	const [userAgent, setUserAgent] = useState('*');
	const [disallow, setDisallow] = useState('/private/\n/admin/');
	const [allow, setAllow] = useState('');
	const [sitemapUrl, setSitemapUrl] = useState('');
	const [crawlDelayEnabled, setCrawlDelayEnabled] = useState(false);
	const [crawlDelay, setCrawlDelay] = useState(10);
	let output = '';
	let error = '';
	try {
		output = buildRobotsTxt({ userAgent, disallow, allow, sitemapUrl, crawlDelay: crawlDelayEnabled ? crawlDelay : null });
	} catch (cause) {
		error = cause instanceof Error ? cause.message : 'Check the robots.txt values.';
	}
	return (
		<div>
			<div className="json-columns">
				<div className="calc-field"><label htmlFor="robots-agent">User-agent</label><input id="robots-agent" value={userAgent} onChange={(event) => setUserAgent(event.target.value)} placeholder="* for all crawlers" /><small>Use * to apply these rules to all crawlers.</small></div>
				<div className="calc-field"><label htmlFor="robots-disallow">Disallow paths (one per line)</label><textarea id="robots-disallow" rows={4} value={disallow} onChange={(event) => setDisallow(event.target.value)} placeholder="/private/" /><small>Each path must begin with /. A blank value adds no disallow rule.</small></div>
				<div className="calc-field"><label htmlFor="robots-allow">Allow paths (one per line)</label><textarea id="robots-allow" rows={4} value={allow} onChange={(event) => setAllow(event.target.value)} placeholder="/public/" /></div>
				<div className="calc-field"><label htmlFor="robots-sitemap">Sitemap URL (optional)</label><input id="robots-sitemap" type="url" value={sitemapUrl} onChange={(event) => setSitemapUrl(event.target.value)} placeholder="https://example.com/sitemap.xml" /></div>
			</div>
			<label className="tool-choice" style={{ marginTop: 12 }}><input type="checkbox" checked={crawlDelayEnabled} onChange={(event) => setCrawlDelayEnabled(event.target.checked)} /> <span>Include crawl delay in seconds</span></label>
			{crawlDelayEnabled && <div className="calc-field" style={{ maxWidth: 240, marginTop: 10 }}><label htmlFor="robots-delay">Crawl delay</label><input id="robots-delay" type="number" min="0" max="86400" step="1" value={crawlDelay} onChange={(event) => setCrawlDelay(Number(event.target.value))} /></div>}
			{error && <p className="tool-message error" role="alert">{error}</p>}
			<div style={{ marginTop: 16 }}><label>robots.txt output</label><GeneratorOutput output={output} filename="robots.txt" emptyText="Complete the form to generate robots.txt rules." /></div>
			<p className="html-formatter-note">User-agent selects the crawler group. Disallow and Allow entries are URL paths, one per line. Crawl-delay is an optional extension and is not supported by every crawler. These rules guide crawling; they do not secure private content.</p>
		</div>
	);
}

export default RobotsTxtGenerator;
