import type { SocialTextTool } from '../../engines/social-content';

export interface SocialTextField {
	id: string;
	label: string;
	placeholder: string;
	required?: boolean;
}

export interface SocialTextConfig {
	tool: SocialTextTool;
	title: string;
	intro: string;
	fields: SocialTextField[];
}

export const socialContentConfigs: Record<SocialTextTool, SocialTextConfig> = {
	caption: {
		tool: 'caption', title: 'Caption Generator', intro: 'Draft editable social captions from your topic and audience.',
		fields: [
			{ id: 'topic', label: 'Post topic', placeholder: 'e.g. a simple weekend baking project', required: true },
			{ id: 'audience', label: 'Audience', placeholder: 'e.g. home bakers' },
			{ id: 'benefit', label: 'Key detail or takeaway', placeholder: 'e.g. a no-knead dough method' },
			{ id: 'platform', label: 'Platform (optional)', placeholder: 'e.g. Instagram' },
		],
	},
	hashtag: {
		tool: 'hashtag', title: 'Hashtag Generator', intro: 'Build a relevant set of editable tags from words you provide.',
		fields: [
			{ id: 'topic', label: 'Topic or post text', placeholder: 'e.g. beginner pottery tips', required: true },
			{ id: 'keyword', label: 'Additional keyword', placeholder: 'e.g. ceramics' },
			{ id: 'industry', label: 'Industry or niche', placeholder: 'e.g. handmade crafts' },
			{ id: 'audience', label: 'Audience', placeholder: 'e.g. new makers' },
		],
	},
	idea: {
		tool: 'idea', title: 'Content Idea Generator', intro: 'Turn a topic into several practical prompts you can adapt.',
		fields: [
			{ id: 'topic', label: 'Topic', placeholder: 'e.g. sustainable home design', required: true },
			{ id: 'audience', label: 'Audience', placeholder: 'e.g. first-time homeowners' },
			{ id: 'platform', label: 'Platform or format', placeholder: 'e.g. short video, newsletter' },
		],
	},
	'youtube-title': {
		tool: 'youtube-title', title: 'YouTube Title Generator', intro: 'Create descriptive, editable title directions for your video.',
		fields: [
			{ id: 'topic', label: 'Video topic', placeholder: 'e.g. organizing a small kitchen', required: true },
			{ id: 'audience', label: 'Intended audience', placeholder: 'e.g. apartment renters' },
			{ id: 'keyword', label: 'Phrase to include (optional)', placeholder: 'e.g. small kitchen storage' },
		],
	},
	'youtube-description': {
		tool: 'youtube-description', title: 'YouTube Description Generator', intro: 'Draft a structured description and replace prompts with your real details.',
		fields: [
			{ id: 'topic', label: 'Video topic', placeholder: 'e.g. choosing a first camera', required: true },
			{ id: 'audience', label: 'Intended audience', placeholder: 'e.g. new photographers' },
			{ id: 'benefit', label: 'What viewers will get', placeholder: 'e.g. a comparison of common options' },
			{ id: 'links', label: 'Resource links or credits', placeholder: 'Add your real links and credits here' },
		],
	},
	script: {
		tool: 'script', title: 'Video Script Generator', intro: 'Create an editable outline with a hook, key points, and close.',
		fields: [
			{ id: 'topic', label: 'Video topic', placeholder: 'e.g. planning a weekly meal prep', required: true },
			{ id: 'audience', label: 'Intended audience', placeholder: 'e.g. busy students' },
			{ id: 'tone', label: 'Tone', placeholder: 'e.g. friendly, direct, curious' },
			{ id: 'platform', label: 'Platform or format', placeholder: 'e.g. 60-second vertical video' },
		],
	},
	bio: {
		tool: 'bio', title: 'Bio Generator', intro: 'Draft a concise profile bio from your role and focus.',
		fields: [
			{ id: 'name', label: 'Name or brand', placeholder: 'e.g. Alex Morgan', required: true },
			{ id: 'role', label: 'Role', placeholder: 'e.g. independent illustrator' },
			{ id: 'topic', label: 'Focus or subject', placeholder: 'e.g. editorial illustration', required: true },
			{ id: 'audience', label: 'Who you serve or speak to', placeholder: 'e.g. small publishers' },
			{ id: 'platform', label: 'Platform', placeholder: 'e.g. LinkedIn' },
		],
	},
	'blog-title': {
		tool: 'blog-title', title: 'Blog Title Generator', intro: 'Explore clear title options for an article topic and readership.',
		fields: [
			{ id: 'topic', label: 'Article topic', placeholder: 'e.g. starting a balcony garden', required: true },
			{ id: 'audience', label: 'Intended reader', placeholder: 'e.g. urban beginners' },
			{ id: 'keyword', label: 'Phrase to include (optional)', placeholder: 'e.g. balcony gardening' },
		],
	},
	'blog-outline': {
		tool: 'blog-outline', title: 'Blog Outline Generator', intro: 'Build an editable article structure; research and add supporting sources before publishing.',
		fields: [
			{ id: 'topic', label: 'Article topic', placeholder: 'e.g. choosing a home espresso machine', required: true },
			{ id: 'audience', label: 'Intended reader', placeholder: 'e.g. first-time buyers' },
			{ id: 'keyword', label: 'Main question or phrase', placeholder: 'e.g. espresso machine basics' },
		],
	},
	cta: {
		tool: 'cta', title: 'Call-to-Action Generator', intro: 'Draft calls to action that state a clear next step without promising outcomes.',
		fields: [
			{ id: 'topic', label: 'Offer or subject', placeholder: 'e.g. free beginner watercolor guide', required: true },
			{ id: 'goal', label: 'Desired next action', placeholder: 'e.g. download the guide', required: true },
			{ id: 'audience', label: 'Audience', placeholder: 'e.g. new watercolor artists' },
		],
	},
	'ad-copy': {
		tool: 'ad-copy', title: 'Advertisement Copy Generator', intro: 'Draft transparent ad-copy options from details you provide. Verify all claims and terms before use.',
		fields: [
			{ id: 'product', label: 'Product or service', placeholder: 'e.g. a reusable travel mug', required: true },
			{ id: 'audience', label: 'Intended audience', placeholder: 'e.g. daily commuters' },
			{ id: 'benefit', label: 'Verified feature or benefit', placeholder: 'e.g. a leak-resistant lid' },
			{ id: 'goal', label: 'Desired next action', placeholder: 'e.g. view sizes and details' },
			{ id: 'brand', label: 'Brand name (optional)', placeholder: 'e.g. Northline Goods' },
		],
	},
};
