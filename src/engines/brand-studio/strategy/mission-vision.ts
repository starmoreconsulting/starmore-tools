import { sanitizeGeneratedText } from './sanitize';

export interface MissionVisionAnswers {
	who: string;
	what: string;
	how: string;
	why: string;
}

export interface StatementVariants {
	plain: string;
	inspiring: string;
	concise: string;
}

export interface MissionVisionResult {
	mission: StatementVariants | null;
	vision: StatementVariants | null;
	missing: { field: string; hint: string }[];
}

function clean(value: string): string {
	return sanitizeGeneratedText(value).replace(/[.!?]+$/g, '').trim();
}

export function generateMissionVision(answers: MissionVisionAnswers): MissionVisionResult {
	const who = clean(answers.who);
	const what = clean(answers.what);
	const how = clean(answers.how);
	const why = clean(answers.why);
	const missing = [
		...(who ? [] : [{ field: 'Who you serve', hint: 'Name a group of people, such as “local makers”.' }]),
		...(what ? [] : [{ field: 'What you do', hint: 'Describe your work, such as “build useful spaces”.' }]),
	];
	if (missing.length) return { mission: null, vision: null, missing };

	const method = how ? ` through ${how}` : '';
	const purpose = why ? ` so ${why}` : '';
	const futurePurpose = why ? ` and, as a result, ${why}` : '';

	return {
		mission: {
			plain: sanitizeGeneratedText(`We help ${who} ${what}${method}${purpose}.`),
			inspiring: sanitizeGeneratedText(`Together, we ${what} for ${who}${method}${purpose}, creating a more hopeful way forward.`),
			concise: sanitizeGeneratedText(`${what} for ${who}${how ? `, with ${how}` : ''}.`),
		},
		vision: {
			plain: sanitizeGeneratedText(`A future where ${who} can ${what}${futurePurpose}.`),
			inspiring: sanitizeGeneratedText(`A brighter future where ${who} can ${what}, with more room to thrive.`),
			concise: sanitizeGeneratedText(`More opportunity for ${who} to ${what}${why ? `, so ${why}` : ''}.`),
		},
		missing: [],
	};
}
