export const socialSizesLastChecked = '2026-11-13';

export interface SocialSizePreset {
	id: string;
	platform: string;
	name: string;
	width: number;
	height: number;
}

export const socialSizePresets: SocialSizePreset[] = [
	{ id: 'instagram-square', platform: 'Instagram', name: 'Square post', width: 1080, height: 1080 },
	{ id: 'instagram-portrait', platform: 'Instagram', name: 'Portrait post', width: 1080, height: 1350 },
	{ id: 'instagram-story', platform: 'Instagram', name: 'Story / Reel', width: 1080, height: 1920 },
	{ id: 'facebook-post', platform: 'Facebook', name: 'Post', width: 1200, height: 630 },
	{ id: 'facebook-cover', platform: 'Facebook', name: 'Cover', width: 1640, height: 624 },
	{ id: 'youtube-thumbnail', platform: 'YouTube', name: 'Thumbnail', width: 1280, height: 720 },
	{ id: 'youtube-banner', platform: 'YouTube', name: 'Banner', width: 2560, height: 1440 },
	{ id: 'linkedin-post', platform: 'LinkedIn', name: 'Post', width: 1200, height: 1200 },
	{ id: 'linkedin-banner', platform: 'LinkedIn', name: 'Banner', width: 1584, height: 396 },
	{ id: 'x-post', platform: 'X', name: 'Post', width: 1600, height: 900 },
	{ id: 'x-header', platform: 'X', name: 'Header', width: 1500, height: 500 },
	{ id: 'whatsapp-status', platform: 'WhatsApp', name: 'Status', width: 1080, height: 1920 },
	{ id: 'whatsapp-profile', platform: 'WhatsApp', name: 'Profile picture', width: 640, height: 640 },
];
