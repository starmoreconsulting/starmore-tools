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
	explanations: { part: string; meaning: string }[];
}

function clean(value: string): string {
	return value.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/g, '');
}

export function generatePositioning(answers: PositioningAnswers): PositioningResult {
	const target = clean(answers.target);
	const brand = clean(answers.brand) || 'This brand';
	const category = clean(answers.category);
	const benefit = clean(answers.benefit);
	const reason = clean(answers.reason);
	const direct = `${target ? `For ${target}, ` : ''}${category ? `${brand} is the ${category}` : brand}`
		+ `${benefit ? (category ? ` that ${benefit}` : `, offering ${benefit}`) : ''}`
		+ `${reason ? ` because ${reason}` : ''}.`;
	const helpful = `${brand} helps${target ? ` ${target}` : ' people'}${benefit ? ` ${benefit}` : ' move forward'}${reason ? `, supported by ${reason}` : ''}.`;
	const categoryLed = `${category ? `A ${category}` : 'A thoughtful choice'}${target ? ` for ${target}` : ''}: ${benefit || 'clear value'}${reason ? `, grounded in ${reason}` : ''}.`;
	const options = [
		{ label: 'For / is / that / because', statement: direct },
		{ label: 'Helpful outcome', statement: helpful },
		{ label: 'Category first', statement: categoryLed },
	];
	return {
		options,
		explanations: [
			{ part: 'For [target]', meaning: 'Names the people or group the brand is designed to serve.' },
			{ part: 'is the [category]', meaning: 'Places the offer in a category people can understand.' },
			{ part: 'that [benefit]', meaning: 'States the useful result customers can expect.' },
			{ part: 'because [reason]', meaning: 'Gives a concrete reason to believe the promise.' },
		],
	};
}
