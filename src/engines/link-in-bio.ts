export interface BioLinkInput {
	label: string;
	url: string;
}

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[character]!);
}

function normalizeHttpUrl(value: string) {
	try {
		const url = new URL(value.trim());
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		return url.toString();
	} catch {
		return null;
	}
}

export function buildLinkInBioHtml(title: string, description: string, links: BioLinkInput[]) {
	const heading = escapeHtml(title.trim() || 'Your name or brand');
	const intro = description.trim() ? `<p class="intro">${escapeHtml(description.trim())}</p>` : '';
	const items = links
		.filter((link) => link.label.trim() || link.url.trim())
		.map((link) => {
			const href = normalizeHttpUrl(link.url);
			if (!href) throw new Error(`Enter a valid HTTP or HTTPS URL for "${link.label.trim() || 'this link'}".`);
			const label = escapeHtml(link.label.trim() || href);
			return `      <li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
		})
		.join('\n');

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description.trim())}">
  <title>${heading}</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, sans-serif; color: #23332c; background: #f5f6f1; }
    body { box-sizing: border-box; max-width: 620px; margin: 0 auto; padding: 48px 20px; }
    main { padding: 28px; border: 1px solid #e1e6dc; border-radius: 16px; background: #fff; box-shadow: 0 12px 36px #23332c12; }
    h1 { margin: 0; font-size: clamp(1.7rem, 7vw, 2.4rem); text-align: center; }
    .intro { margin: 12px 0 24px; color: #5b665d; line-height: 1.6; text-align: center; }
    ul { display: grid; gap: 12px; margin: 24px 0 0; padding: 0; list-style: none; }
    a { display: block; padding: 14px 18px; border-radius: 9px; background: #42644a; color: #fff; font-weight: 650; text-align: center; text-decoration: none; overflow-wrap: anywhere; }
    a:focus-visible { outline: 3px solid #111; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>${heading}</h1>
    ${intro}
    <ul>
${items}
    </ul>
  </main>
</body>
</html>
`;
}
