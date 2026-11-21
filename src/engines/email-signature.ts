export interface EmailSignatureProfile {
	name: string;
	title: string;
	company: string;
	email: string;
	phone: string;
	website: string;
	colour: string;
}

export function escapeHtml(value: string) {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function generateEmailSignature(profile: EmailSignatureProfile) {
	const name = escapeHtml(profile.name);
	const title = escapeHtml(profile.title);
	const company = escapeHtml(profile.company);
	const email = escapeHtml(profile.email);
	const phone = escapeHtml(profile.phone);
	const website = escapeHtml(profile.website);
	const safeColour = /^#[0-9a-f]{6}$/i.test(profile.colour) ? profile.colour : '#356b54';
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;color:#202820;font-size:14px;line-height:1.4"><tr><td style="border-left:4px solid ${safeColour};padding-left:14px"><strong style="font-size:16px;color:${safeColour}">${name || 'Your Name'}</strong><br>${title ? `${title}<br>` : ''}${company ? `<strong>${company}</strong><br>` : ''}${email ? `<a href="mailto:${email}" style="color:${safeColour}">${email}</a><br>` : ''}${phone ? `${phone}<br>` : ''}${website ? `<a href="${/^https?:\/\//i.test(website) ? website : `https://${website}`}" style="color:${safeColour}">${website}</a>` : ''}</td></tr></table>`;
}
