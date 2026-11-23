export const socialSizesLastChecked = '2026-11-13';

export interface SocialSizePreset {
	id: string;
	platform: string;
	name: string;
	width: number;
	height: number;
	sourceId: string;
}

export interface SocialSizeSource {
	id: string;
	platform: string;
	label: string;
	url: string;
}

export const socialSizeSourceNote = 'These are current-known, commonly used design canvas recommendations—not guarantees that a platform accepts or displays every placement at exactly these dimensions. Platform rules, crops, safe areas, and limits can change and vary by placement or device. Consult the linked platform help center for the latest requirements before publishing; some recommendations are not published as fixed official pixel specifications.';

export const socialSizeSources: SocialSizeSource[] = [
	{ id: 'instagram', platform: 'Instagram', label: 'Meta Business Help Center', url: 'https://www.facebook.com/business/help' },
	{ id: 'facebook', platform: 'Facebook', label: 'Meta Business Help Center', url: 'https://www.facebook.com/business/help' },
	{ id: 'youtube', platform: 'YouTube', label: 'YouTube Help Center', url: 'https://support.google.com/youtube/' },
	{ id: 'linkedin', platform: 'LinkedIn', label: 'LinkedIn Help Center', url: 'https://www.linkedin.com/help/linkedin/' },
	{ id: 'x', platform: 'X', label: 'X Help Center', url: 'https://help.x.com/' },
	{ id: 'whatsapp', platform: 'WhatsApp', label: 'WhatsApp Help Center', url: 'https://faq.whatsapp.com/' },
];

export const socialSizePresets: SocialSizePreset[] = [
	{ id: 'instagram-square', platform: 'Instagram', name: 'Square feed post', width: 1080, height: 1080, sourceId: 'instagram' },
	{ id: 'instagram-portrait', platform: 'Instagram', name: 'Portrait feed post', width: 1080, height: 1350, sourceId: 'instagram' },
	{ id: 'instagram-story', platform: 'Instagram', name: 'Story / Reel canvas', width: 1080, height: 1920, sourceId: 'instagram' },
	{ id: 'facebook-post', platform: 'Facebook', name: 'Shared link image (wide)', width: 1200, height: 630, sourceId: 'facebook' },
	{ id: 'facebook-cover', platform: 'Facebook', name: 'Page cover (high-resolution canvas)', width: 1640, height: 624, sourceId: 'facebook' },
	{ id: 'youtube-thumbnail', platform: 'YouTube', name: 'Video thumbnail', width: 1280, height: 720, sourceId: 'youtube' },
	{ id: 'youtube-banner', platform: 'YouTube', name: 'Channel banner', width: 2560, height: 1440, sourceId: 'youtube' },
	{ id: 'linkedin-post', platform: 'LinkedIn', name: 'Square feed image', width: 1200, height: 1200, sourceId: 'linkedin' },
	{ id: 'linkedin-banner', platform: 'LinkedIn', name: 'Personal profile background', width: 1584, height: 396, sourceId: 'linkedin' },
	{ id: 'x-post', platform: 'X', name: 'Post image (wide)', width: 1600, height: 900, sourceId: 'x' },
	{ id: 'x-header', platform: 'X', name: 'Profile header', width: 1500, height: 500, sourceId: 'x' },
	{ id: 'whatsapp-status', platform: 'WhatsApp', name: 'Status image', width: 1080, height: 1920, sourceId: 'whatsapp' },
	{ id: 'whatsapp-profile', platform: 'WhatsApp', name: 'Profile picture', width: 640, height: 640, sourceId: 'whatsapp' },
];
