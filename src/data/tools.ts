export const departments = [
	{ slug: 'text', name: 'Text', description: 'Small helpers for words, writing, and everything in between.' },
	{ slug: 'developer', name: 'Developer', description: 'Handy utilities for working with code and structured data.' },
	{ slug: 'calculators', name: 'Calculators', description: 'Straightforward calculators for everyday numbers and quick answers.' },
] as const;

export type DepartmentSlug = (typeof departments)[number]['slug'];
export type ToolComponentName =
	| 'CaseConverter'
	| 'WordCounter'
	| 'JsonFormatter'
	| 'PercentageCalculator'
	| 'LoanRepaymentCalculator';

export interface ToolDefinition {
	slug: string;
	name: string;
	department: DepartmentSlug;
	description: string;
	component: ToolComponentName;
	icon: string;
	live: boolean;
}

export const tools: ToolDefinition[] = [
	{
		slug: 'case-converter',
		name: 'Case Converter',
		department: 'text',
		description: 'Switch between uppercase, lowercase, and title case in a click.',
		component: 'CaseConverter',
		icon: 'Aa',
		live: true,
	},
	{
		slug: 'word-counter',
		name: 'Word Counter',
		department: 'text',
		description: 'Get a quick read on words, characters, and reading time.',
		component: 'WordCounter',
		icon: '123',
		live: true,
	},
	{
		slug: 'json-formatter',
		name: 'JSON Formatter',
		department: 'developer',
		description: 'Make JSON easier to read, or compress it down to one line.',
		component: 'JsonFormatter',
		icon: '{ }',
		live: true,
	},
	{
		slug: 'percentage-calculator',
		name: 'Percentage Calculator',
		department: 'calculators',
		description: 'Work out percentages, increases and decreases instantly.',
		component: 'PercentageCalculator',
		icon: '%',
		live: true,
	},
	{
		slug: 'loan-repayment-calculator',
		name: 'Loan Repayment Calculator',
		department: 'calculators',
		description: 'Estimate monthly loan repayments.',
		component: 'LoanRepaymentCalculator',
		icon: '$',
		live: false,
	},
];

export const liveTools = tools.filter((tool) => tool.live);
