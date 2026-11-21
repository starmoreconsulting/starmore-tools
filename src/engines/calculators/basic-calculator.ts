const MAX_EXPRESSION_LENGTH = 256;

export function calculateBasicExpression(source: string): number {
	if (source.length > MAX_EXPRESSION_LENGTH) {
		throw new Error('Keep the expression to 256 characters or fewer.');
	}

	const input = source.replace(/[×]/g, '*').replace(/[÷]/g, '/').replace(/[−]/g, '-');
	let position = 0;

	const skipWhitespace = () => {
		while (/\s/.test(input[position] ?? '')) position += 1;
	};

	const parseExpression = (): number => {
		let value = parseTerm();
		while (true) {
			skipWhitespace();
			const operator = input[position];
			if (operator !== '+' && operator !== '-') return value;
			position += 1;
			const right = parseTerm();
			value = checked(operator === '+' ? value + right : value - right);
		}
	};

	const parseTerm = (): number => {
		let value = parseUnary();
		while (true) {
			skipWhitespace();
			const operator = input[position];
			if (operator !== '*' && operator !== '/' && operator !== '%') return value;
			position += 1;
			const right = parseUnary();
			if ((operator === '/' || operator === '%') && right === 0) {
				throw new Error('Division by zero is not allowed.');
			}
			value = checked(
				operator === '*' ? value * right
					: operator === '/' ? value / right
						: value % right,
			);
		}
	};

	const parseUnary = (): number => {
		skipWhitespace();
		if (input[position] === '+' || input[position] === '-') {
			const sign = input[position] === '-' ? -1 : 1;
			position += 1;
			return checked(sign * parseUnary());
		}
		return parsePrimary();
	};

	const parsePrimary = (): number => {
		skipWhitespace();
		if (input[position] === '(') {
			position += 1;
			const value = parseExpression();
			skipWhitespace();
			if (input[position] !== ')') throw new Error('Check that every opening parenthesis has a closing one.');
			position += 1;
			return value;
		}

		const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(input.slice(position));
		if (!match) throw new Error('Enter a valid number or arithmetic expression.');
		position += match[0].length;
		return checked(Number(match[0]));
	};

	const checked = (value: number): number => {
		if (!Number.isFinite(value)) throw new Error('The result is outside the calculator’s supported range.');
		return value;
	};

	skipWhitespace();
	if (!input.trim()) throw new Error('Enter an expression to calculate.');
	const result = parseExpression();
	skipWhitespace();
	if (position !== input.length) throw new Error('Check the expression and try again.');
	return checked(result);
}
