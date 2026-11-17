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
	return value.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
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
			plain: `${subject} ${action}${method}${purpose}.`,
			inspiring: `Together, we ${action}${who ? ` for ${who}` : ''}${method}${purpose}, creating a more hopeful way forward.`,
			concise: `${action}${who ? ` for ${who}` : ''}${how ? `, with ${how}` : ''}.`,
		},
		vision: {
			plain: `A future where ${futureSubject} ${futureAction}${futurePurpose}.`,
			inspiring: `A brighter future where ${who || 'communities'} ${futureAction}${futurePurpose}, and more people have room to thrive.`,
			concise: `More ${what || 'possibility'} for ${who || 'people'}${why ? `, built on ${why}` : ''}.`,
		},
	};
}
