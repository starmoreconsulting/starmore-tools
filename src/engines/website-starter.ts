export interface WebsiteStarterProfile {
	brand: string;
	title: string;
	description: string;
	primary: string;
	background: string;
}

export function escapeHtml(value: string) {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function generateWebsiteStarter(profile: WebsiteStarterProfile) {
	const brand = escapeHtml(profile.brand || 'Your Brand');
	const title = escapeHtml(profile.title || 'Welcome to our website');
	const description = escapeHtml(profile.description || 'A clear message about what your business does.');
	const primary = /^#[0-9a-f]{6}$/i.test(profile.primary) ? profile.primary : '#356b54';
	const background = /^#[0-9a-f]{6}$/i.test(profile.background) ? profile.background : '#f7f8f4';
	const css = `:root{--primary:${primary};--background:${background};font-family:Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:var(--background);color:#202820}.nav{display:flex;justify-content:space-between;align-items:center;padding:24px 8%;border-bottom:1px solid #dde4db}.hero{max-width:1100px;margin:auto;padding:100px 8%}.hero h1{max-width:800px;font-size:clamp(42px,8vw,72px);margin:0 0 20px}.hero p{max-width:620px;font-size:20px;line-height:1.6}.button{display:inline-block;margin-top:20px;padding:14px 22px;border-radius:8px;background:var(--primary);color:white;text-decoration:none}`;
	const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body><nav class="nav"><strong>${brand}</strong><a href="#contact">Contact</a></nav><main class="hero"><h1>${title}</h1><p>${description}</p><a class="button" href="#contact">Get started</a></main></body></html>`;
	return { html, css };
}
