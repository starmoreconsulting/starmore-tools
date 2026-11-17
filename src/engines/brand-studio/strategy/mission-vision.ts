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
	mission: StatementVariants;
	vision: StatementVariants;
}

function clean(value: string): string {
	return sanitizeGeneratedText(value).replace(/[.!?]+$/g, '');
}

export function generateMissionVision(answers: MissionVisionAnswers): MissionVisionResult {
	const who = clean(answers.who);
	const what = clean(answers.what);
	const how = clean(answers.how);
	const why = clean(answers.why);
	const subject = who ? `We help ${who}` : 'We help people';
	const action = what || 'make useful progress';
	const method = how ? ` through ${how}` : '';
	const purpose = why ? ` so ${why}` : '';
	const futureSubject = who ? `${who} can` : 'people can';
	const futureAction = what ? `benefit from ${what}` : 'do meaningful work';
	const futurePurpose = why ? `, with ${why}` : '';

	return {
		mission: {
			plain: sanitizeGeneratedText(`${subject} ${action}${method}${purpose}.`),
			inspiring: sanitizeGeneratedText(`Together, we ${action}${who ? ` for ${who}` : ''}${method}${purpose}, creating a more hopeful way forward.`),
			concise: sanitizeGeneratedText(`${action}${who ? ` for ${who}` : ''}${how ? `, with ${how}` : ''}.`),
		},
		vision: {
			plain: sanitizeGeneratedText(`A future where ${futureSubject} ${futureAction}${futurePurpose}.`),
			inspiring: sanitizeGeneratedText(`A brighter future where ${who || 'communities'} ${futureAction}${futurePurpose}, and more people have room to thrive.`),
			concise: sanitizeGeneratedText(`More ${what || 'possibility'} for ${who || 'people'}${why ? `, built on ${why}` : ''}.`),
		},
	};
}
import { sanitizeGeneratedText } from './sanitize';
