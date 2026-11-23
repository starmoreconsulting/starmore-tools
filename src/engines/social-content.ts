export type SocialTextTool =
	| 'caption' | 'hashtag' | 'idea' | 'youtube-title' | 'youtube-description'
	| 'script' | 'bio' | 'blog-title' | 'blog-outline' | 'cta' | 'ad-copy';

export type SocialTextInput = Record<string, string>;

const value = (input: SocialTextInput, key: string, fallback = '') => input[key]?.trim() || fallback;
const sentence = (text: string) => text.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
const titleCase = (text: string) => text.replace(/\b\w/g, (letter) => letter.toUpperCase());
const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const safe = (text: string) => sentence(text) || 'your topic';

function topic(input: SocialTextInput) {
	return safe(value(input, 'topic', value(input, 'subject', value(input, 'product', 'your topic'))));
}

function variantsFor(tool: SocialTextTool, input: SocialTextInput): string[] {
	const subject = topic(input);
	const audience = safe(value(input, 'audience', 'your audience'));
	const platform = value(input, 'platform', 'your channel');
	const tone = value(input, 'tone', 'clear and engaging');
	const keywordInput = value(input, 'keyword');
	const keyword = safe(keywordInput || subject);
	const goal = safe(value(input, 'goal', 'take the next step'));
	const benefit = safe(value(input, 'benefit', `a practical look at ${subject}`));
	const offer = safe(value(input, 'offer', subject));
	const name = safe(value(input, 'name', 'Your Name'));
	const role = safe(value(input, 'role', 'creator'));
	const brand = value(input, 'brand');
	const audiencePhrase = audience.toLowerCase();

	switch (tool) {
		case 'caption':
			return [
				`${subject}: ${benefit}.${platform ? ` Draft for ${platform}.` : ''} What would you add?`,
				`A little more about ${subject}—made with ${audiencePhrase} in mind. Save this for later and share your take.`,
				`The useful detail about ${subject}: ${benefit}. Join the conversation below.`,
			];
		case 'hashtag': {
			const words = `${subject} ${value(input, 'keyword')} ${value(input, 'industry')} ${value(input, 'audience')}`
				.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
			const unique = [...new Set(words.filter((word) => word.length > 2))];
			const tags = unique.slice(0, 10).map((word) => `#${word}`);
			['content', 'ideas', 'community', 'inspiration', 'tips'].forEach((tag) => {
				if (tags.length < 10 && !tags.includes(`#${tag}`)) tags.push(`#${tag}`);
			});
			return [
				tags.slice(0, 5).join(' '),
				tags.slice(2, 8).join(' '),
				tags.slice(-5).join(' '),
			];
		}
		case 'idea':
			return [
				`A beginner's guide to ${subject}: share 3 steps ${audiencePhrase} can try this week.${platform ? ` Format: ${platform}.` : ''}`,
				`Behind the scenes: show how you approach ${subject}, including one decision and one lesson learned.`,
				`Myth vs. reality: invite ${audiencePhrase} to compare a common assumption about ${subject} with your experience.`,
			];
		case 'youtube-title':
			return [
				`${titleCase(subject)}: A Practical Guide${value(input, 'audience') ? ` for ${titleCase(audience)}` : ' for Beginners'}${keywordInput ? ` | ${titleCase(keyword)}` : ''}`,
				`I Tried ${titleCase(subject)}—Here’s What I Learned${keywordInput ? ` (${titleCase(keyword)})` : ''}`,
				`${titleCase(subject)} Explained: 5 Ideas Worth Knowing${keywordInput ? ` | ${titleCase(keyword)}` : ''}`,
			];
		case 'youtube-description':
			return [
				`In this video, we explore ${subject} with ${audiencePhrase} in mind. ${benefit}.\n\nChapters:\n00:00 Introduction\n00:30 The basics\n02:00 Practical next steps\n\nWhat would you like to learn next?`,
				`Looking to understand ${subject}? This video walks through the key points, practical examples, and useful next steps.\n\n${value(input, 'links', 'Resources: add your relevant links here')}\n\nSubscribe if this format is useful to you.`,
				`Today’s topic: ${subject}.\n\nYou’ll learn:\n• The main idea\n• Common considerations\n• How to explore it further\n\nThis is general information based on the creator’s experience. Check details for your own situation.`,
			];
		case 'script':
			return [
				`[HOOK]\nHave you been thinking about ${subject}?\n\n[INTRO]\nI’m covering this for ${audiencePhrase} in a ${tone} way.\n\n[KEY POINTS]\n1. Start with the outcome you want.\n2. Break the process into manageable steps.\n3. Review what worked and adjust.\n\n[CLOSE]\nTry one step and share what you learned. This is a starting script—adapt it to your voice.`,
				`[OPEN]\nHere’s one thing to know about ${subject}.\n\n[DEMONSTRATION]\nShow or explain ${benefit}.\n\n[TAKEAWAY]\nKeep it simple: choose one useful action and give it a try.\n\n[CTA]\nWhat should I cover next?`,
				`[SCENE 1 — QUESTION]\nWhat makes ${subject} useful for ${audiencePhrase}?\n\n[SCENE 2 — EXPLANATION]\nOffer one clear example, then explain the steps in your own words.\n\n[SCENE 3 — WRAP-UP]\nSummarize the main point and invite viewers to continue the discussion.`,
			];
		case 'bio':
			return [
				`${name} | ${role}\n${brand ? `${brand} — ` : ''}Sharing practical ideas about ${subject}.\nFollow along for useful notes and new perspectives.`,
				`${name} — ${role}\nHelping ${audiencePhrase} explore ${subject}.\nNew posts on ${platform || 'this page'}; say hello below.`,
				`${brand}\n${role} focused on ${subject}.\nHere to share what I learn, one useful post at a time.`,
			];
		case 'blog-title':
			return [
				`${titleCase(subject)}: A Practical Guide for ${titleCase(audience)}${keywordInput ? ` | ${titleCase(keyword)}` : ''}`,
				`What to Know About ${titleCase(subject)} Before You Begin${keywordInput ? ` (${titleCase(keyword)})` : ''}`,
				`${titleCase(subject)} Made Clear: Key Ideas, Examples, and Next Steps${keywordInput ? ` | ${titleCase(keyword)}` : ''}`,
			];
		case 'blog-outline':
			return [
				`# ${titleCase(subject)}\n\n## Introduction\n- Set context for ${audiencePhrase}\n- Explain what readers will learn${keywordInput ? `\n- Address the question or phrase: ${keyword}` : ''}\n\n## The essentials\n- Define the main terms\n- Explain why they matter\n\n## A practical approach\n- Step 1: Identify your goal\n- Step 2: Choose a suitable method\n- Step 3: Review and refine\n\n## Common questions\n- Address likely concerns with sourced, specific answers\n\n## Conclusion\n- Recap key points\n- Suggest a realistic next step`,
				`# ${titleCase(subject)}: An Overview\n\n## Start here\n- Who this guide is for\n- What to prepare\n\n## Core concepts\n- The key ideas\n- A concrete example\n\n## Putting it into practice\n- A short checklist\n- Common pitfalls to verify\n\n## Further reading\n- Add trustworthy references\n\n## Summary\n- Main takeaway\n- Reader action`,
				`# Understanding ${titleCase(subject)}\n\n## Opening: the question to answer\n## Background and context\n## Three important considerations\n1. First consideration\n2. Second consideration\n3. Third consideration\n## Example or case study\n## Frequently asked questions\n## Final thoughts and next steps`,
			];
		case 'cta':
			return [
				`Ready to explore ${subject}? ${sentenceCase(goal)}—a practical next step for ${audiencePhrase}.`,
				`Want to learn more about ${subject}? ${sentenceCase(goal)} and tell us what you discover.`,
				`Take the next step with ${subject}: ${sentenceCase(goal)}. A useful place to begin for ${audiencePhrase}.`,
			];
		case 'ad-copy':
			return [
				`${brand ? `${brand}: ` : ''}${offer}: ${benefit}.\n\nMade for ${audiencePhrase} looking for a thoughtful option. ${sentenceCase(goal)}.`,
				`Explore ${offer}.\n\nA straightforward way to learn more about ${subject}. Review the features, terms, and details before choosing. ${sentenceCase(goal)}.`,
				`Considering ${subject}?\n\nDiscover what ${offer} includes and how it may suit your goals. ${sentenceCase(goal)}.`,
			];
	}
}

export function generateSocialText(tool: SocialTextTool, input: SocialTextInput): string[] {
	return variantsFor(tool, input).map((result) => result.replace(/\n{3,}/g, '\n\n').trim());
}

export interface ContentCalendarEntry {
	date: string;
	platform: string;
	content: string;
}

function csvCell(value: string) {
	return `"${value.replace(/"/g, '""')}"`;
}

export function formatCalendarCsv(entries: ContentCalendarEntry[]): string {
	return [
		['Date', 'Platform', 'Content'].map(csvCell).join(','),
		...entries.map(({ date, platform, content }) => [date, platform, content].map(csvCell).join(',')),
	].join('\r\n');
}

function escapeIcs(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function formatCalendarIcs(entries: ContentCalendarEntry[]): string {
	const events = entries.filter((entry) => {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) return false;
		const parsed = new Date(`${entry.date}T00:00:00Z`);
		return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === entry.date;
	}).map((entry, index) => {
		const dayAfter = new Date(`${entry.date}T00:00:00Z`);
		dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
		const end = dayAfter.toISOString().slice(0, 10).replace(/-/g, '');
		const start = entry.date.replace(/-/g, '');
		return [
			'BEGIN:VEVENT', `UID:starmore-${start}-${index}@local`, `DTSTART;VALUE=DATE:${start}`,
			`DTEND;VALUE=DATE:${end}`, `SUMMARY:${escapeIcs(entry.platform || 'Content')}`,
			`DESCRIPTION:${escapeIcs(entry.content)}`, 'END:VEVENT',
		].join('\r\n');
	});
	return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Starmore Tools//Content Calendar//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}

export const VIDEO_ASPECT_RATIOS = {
	'1:1': [1, 1],
	'4:5': [4, 5],
	'16:9': [16, 9],
	'9:16': [9, 16],
	'1.91:1': [1.91, 1],
	'3:2': [3, 2],
} as const;

export type VideoAspectRatio = keyof typeof VIDEO_ASPECT_RATIOS;

export function fitVideoDimensions(width: number, height: number, ratio: VideoAspectRatio) {
	if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
		throw new Error('Enter positive whole-number pixel dimensions.');
	}
	const [ratioWidth, ratioHeight] = VIDEO_ASPECT_RATIOS[ratio];
	const scale = Math.min(width / ratioWidth, height / ratioHeight);
	return { width: Math.floor(ratioWidth * scale), height: Math.floor(ratioHeight * scale) };
}
