import { sanitizeGeneratedText } from './sanitize';

export interface PositioningAnswers {
	target: string;
	brand: string;
	category: string;
	benefit: string;
	reason: string;
}

export interface PositioningOption {
	label: string;
	statement: string;
}

export interface PositioningResult {
	options: PositioningOption[];
	missing: { field: string; hint: string }[];
	explanations: { part: string; meaning: string }[];
}

const REQUIRED_FIELDS = [
	{ key: 'target', field: 'Target audience', hint: 'Enter a group of people, such as “independent makers”.' },
	{ key: 'category', field: 'Category', hint: 'Say what the business is, such as “design studio”.' },
	{ key: 'benefit', field: 'Main benefit', hint: 'Start with a verb, such as “make useful spaces”.' },
] as const;

function clean(value: string): string {
	return sanitizeGeneratedText(value).replace(/[.!?]+$/g, '').trim();
}

function toInfinitive(value: string): string {
	const [firstWord, ...rest] = value.split(/\s+/);
	if (!firstWord || !/s$/i.test(firstWord) || /ss$/i.test(firstWord)) return value;
	if (/^(is|has|does)$/i.test(firstWord)) return value;
	return [firstWord.slice(0, -1), ...rest].join(' ');
}

function isThirdPersonBenefit(value: string): boolean {
	const firstWord = value.split(/\s+/)[0] ?? '';
	return /s$/i.test(firstWord) && !/ss$/i.test(firstWord);
}

export function generatePositioning(answers: PositioningAnswers): PositioningResult {
	const target = clean(answers.target);
	const brand = clean(answers.brand);
	const category = clean(answers.category);
	const benefit = clean(answers.benefit);
	const reason = clean(answers.reason);
	const missing = REQUIRED_FIELDS
		.filter(({ key }) => !answers[key].trim())
		.map(({ field, hint }) => ({ field, hint }));

	if (missing.length) {
		return {
			options: [],
			missing,
			explanations: [
				{ part: 'Target audience', meaning: 'Names the people or group the brand is designed to serve.' },
				{ part: 'Category', meaning: 'Places the offer in a category people can understand.' },
				{ part: 'Main benefit', meaning: 'States the useful result customers can expect.' },
			],
		};
	}

	const infinitiveBenefit = toInfinitive(benefit);
	const first = brand
		? `${brand} helps ${target} ${infinitiveBenefit}`
		: `We help ${target} ${infinitiveBenefit}`;
	const second = brand
		? `${brand} is the ${category} for ${target} who want to ${infinitiveBenefit}`
		: `We are the ${category} for ${target} who want to ${infinitiveBenefit}`;
	const third = `For ${target}, ${brand || 'we'} exist${brand ? 's' : ''} to help them ${infinitiveBenefit}`;
	const options: PositioningOption[] = [
		{
			label: 'Helpful outcome',
			statement: sanitizeGeneratedText(`${first}${reason ? `, because ${reason}` : ''}.`),
		},
		{
			label: 'Category and audience',
			statement: sanitizeGeneratedText(`${second}.`),
		},
		{
			label: 'Audience first',
			statement: sanitizeGeneratedText(`${third}.`),
		},
	];

	if (isThirdPersonBenefit(benefit) && !/ss$/i.test(benefit.split(/\s+/)[0] ?? '')) {
		const classic = brand
			? `For ${target}, ${brand} is the ${category} that ${benefit}${reason ? ` because ${reason}` : ''}.`
			: `For ${target}, we are the ${category} that ${benefit}${reason ? ` because ${reason}` : ''}.`;
		options.push({
			label: 'Classic positioning',
			statement: sanitizeGeneratedText(classic),
		});
	}

	return {
		options,
		missing: [],
		explanations: [
			{ part: 'Target audience', meaning: 'Names the people or group the brand is designed to serve.' },
			{ part: 'Category', meaning: 'Places the offer in a category people can understand.' },
			{ part: 'Main benefit', meaning: 'States the useful result customers can expect.' },
			{ part: 'Reason', meaning: 'Adds an optional reason to believe the promise.' },
		],
	};
}
