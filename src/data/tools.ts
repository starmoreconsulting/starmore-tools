export const departments = [
	{ slug: 'text', name: 'Text', description: 'Small helpers for words, writing, and everything in between.' },
	{ slug: 'developer', name: 'Developer', description: 'Handy utilities for working with code and structured data.' },
	{ slug: 'calculators', name: 'Calculators', description: 'Straightforward calculators for everyday numbers and quick answers.' },
	{ slug: 'utilities', name: 'Utilities', description: 'Simple helpers for sharing, creating, and organizing everyday information.' },
	{ slug: 'security', name: 'Security', description: 'Browser-based tools to help with everyday digital security.' },
	{ slug: 'image', name: 'Image', description: 'Private, browser-based tools for resizing and optimizing images.' },
	{ slug: 'logo', name: 'Logo Studio', description: 'Design and export logos privately in your browser.' },
	] as const;

export type DepartmentSlug = (typeof departments)[number]['slug'];
export type ToolComponentName =
	| 'CaseConverter'
	| 'WordCounter'
	| 'JsonFormatter'
	| 'PercentageCalculator'
	| 'DiscountCalculator'
	| 'VatCalculator'
	| 'ProfitMarginCalculator'
	| 'LoanRepaymentCalculator'
	| 'AgeCalculator'
	| 'CharacterCounter'
	| 'DateDifferenceCalculator'
	| 'CompoundInterestCalculator'
	| 'UnitConverter'
	| 'RemoveDuplicateLines'
	| 'QrCodeGenerator'
	| 'PasswordGenerator'
	| 'ImageCompressor'
	| 'ImageResizer'
	| 'RoiCalculator'
	| 'BmiCalculator'
	| 'SimpleInterestCalculator'
	| 'DateAddSubtractCalculator'
	| 'TimeZoneConverter'
	| 'ReadingTimeCalculator'
	| 'SentenceParagraphCounter'
	| 'SortTextAlphabetically'
	| 'FindReplaceText'
	| 'TextToSlugConverter'
	| 'LogoStudioApp';

export interface ToolDefinition {
	slug: string;
	name: string;
	department: DepartmentSlug;
	description: string;
	seoTitle: string;
	seoDescription: string;
	howTo: [string, string, string];
	faqs: { question: string; answer: string }[];
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
		seoTitle: 'Free Online Case Converter',
		seoDescription: 'Convert text to uppercase, lowercase, title case, or sentence case instantly with this free browser-based case converter.',
		howTo: ['Type or paste text into the text box.', 'Choose the case style you want to apply.', 'Copy the converted text or make another change.'],
		faqs: [
			{ question: 'Does this converter upload my text?', answer: 'No. Your text is processed in your browser and is not sent to a server.' },
			{ question: 'Can I convert only part of my text?', answer: 'The converter applies the selected case to all text in the box. You can edit the text before or after converting.' },
		],
		component: 'CaseConverter',
		icon: 'Aa',
		live: true,
	},
	{
		slug: 'word-counter',
		name: 'Word Counter',
		department: 'text',
		description: 'Get a quick read on words, characters, and reading time.',
		seoTitle: 'Free Online Word Counter',
		seoDescription: 'Count words and characters and estimate reading time in your browser with Starmore Tools’ free word counter.',
		howTo: ['Paste or type your text into the box.', 'Read the live word and character totals below it.', 'Edit the text to update the counts instantly.'],
		faqs: [
			{ question: 'How are words counted?', answer: 'A word is any group of non-whitespace characters separated by spaces or line breaks.' },
			{ question: 'Is my text saved or shared?', answer: 'No. The count runs locally in your browser; the text is not uploaded.' },
		],
		component: 'WordCounter',
		icon: '123',
		live: true,
	},
	{
		slug: 'json-formatter',
		name: 'JSON Formatter',
		department: 'developer',
		description: 'Make JSON easier to read, or compress it down to one line.',
		seoTitle: 'Free Online JSON Formatter and Minifier',
		seoDescription: 'Format JSON with readable indentation or minify it into one line. Validate and transform JSON locally in your browser.',
		howTo: ['Paste valid JSON into the input panel.', 'Choose Format JSON or Minify JSON.', 'Copy the result, or edit the input to try again.'],
		faqs: [
			{ question: 'Does the formatter validate JSON?', answer: 'Yes. It uses your browser’s JSON parser and displays a helpful error if the input is invalid.' },
			{ question: 'Is my JSON sent to a server?', answer: 'No. Formatting and minifying are performed entirely in your browser.' },
		],
		component: 'JsonFormatter',
		icon: '{ }',
		live: true,
	},
	{
		slug: 'percentage-calculator',
		name: 'Percentage Calculator',
		department: 'calculators',
		description: 'Work out percentages, increases and decreases instantly.',
		seoTitle: 'Free Percentage Calculator',
		seoDescription: 'Calculate a percentage of a number, find what percent one value is of another, or work out percentage change.',
		howTo: ['Choose the kind of percentage calculation you need.', 'Enter both values in the fields.', 'Read the result, which updates as you type.'],
		faqs: [
			{ question: 'Can I calculate a percentage increase or decrease?', answer: 'Yes. Choose Percentage change and enter the starting and ending values. A positive result is an increase; a negative result is a decrease.' },
			{ question: 'Why is a result unavailable when the second value is zero?', answer: 'Finding what percent one number is of another requires dividing by the second value, so that value cannot be zero.' },
		],
		component: 'PercentageCalculator',
		icon: '%',
		live: true,
	},
	{
		slug: 'discount-calculator',
		name: 'Discount Calculator',
		department: 'calculators',
		description: 'Find the savings and final price after a discount.',
		seoTitle: 'Free Discount Calculator',
		seoDescription: 'Calculate how much you save and the final price after a percentage discount with this free online discount calculator.',
		howTo: ['Enter the original price before discount.', 'Enter a discount rate from 0% to 100%.', 'See the amount saved and the discounted price.'],
		faqs: [
			{ question: 'How do I find the price after a discount?', answer: 'The calculator subtracts the discount amount from the original price. For example, 20% off 50 saves 10, leaving 40.' },
			{ question: 'Can I enter a 100% discount?', answer: 'Yes. A 100% discount means the full original price is discounted, so the final price is zero.' },
		],
		component: 'DiscountCalculator',
		icon: '−%',
		live: true,
	},
	{
		slug: 'vat-calculator',
		name: 'VAT and Tax Calculator',
		department: 'calculators',
		description: 'Add VAT to a price or remove it with a custom tax rate.',
		seoTitle: 'Free VAT and Tax Calculator',
		seoDescription: 'Add VAT to a net price or remove VAT from a gross price using a custom tax rate with this free online calculator.',
		howTo: ['Choose Add VAT or Remove VAT.', 'Enter the price and your VAT or tax rate.', 'See the VAT amount and the resulting price.'],
		faqs: [
			{ question: 'Can I use a tax rate other than 20%?', answer: 'Yes. Enter any non-negative rate that applies to your calculation; the rate is fully customizable.' },
			{ question: 'What is the difference between adding and removing VAT?', answer: 'Adding VAT calculates tax on a pre-tax price. Removing VAT works backward from a tax-inclusive price to find the pre-tax amount.' },
		],
		component: 'VatCalculator',
		icon: 'VAT',
		live: true,
	},
	{
		slug: 'profit-margin-calculator',
		name: 'Profit Margin and Markup Calculator',
		department: 'calculators',
		description: 'Compare profit margin and markup from cost and selling prices.',
		seoTitle: 'Free Profit Margin and Markup Calculator',
		seoDescription: 'Calculate profit, profit margin, and markup from a product’s cost and selling price using this free online calculator.',
		howTo: ['Enter the cost price and selling price.', 'Use non-negative values in the same currency or unit.', 'Compare profit, margin, and markup in the results.'],
		faqs: [
			{ question: 'What is the difference between margin and markup?', answer: 'Margin is profit as a percentage of the selling price. Markup is profit as a percentage of the cost price.' },
			{ question: 'Why can margin or markup be unavailable?', answer: 'Margin is undefined when the selling price is zero, and markup is undefined when the cost price is zero.' },
		],
		component: 'ProfitMarginCalculator',
		icon: '↗',
		live: true,
	},
	{
		slug: 'loan-repayment-calculator',
		name: 'Loan Repayment Calculator',
		department: 'calculators',
		description: 'Estimate monthly loan repayments, total paid, and total interest.',
		seoTitle: 'Free Loan Repayment Calculator',
		seoDescription: 'Estimate your monthly loan payment, total amount paid, and total interest from the loan amount, annual rate, and term.',
		howTo: ['Enter the amount borrowed, annual interest rate, and loan term.', 'Use the same currency for the amount and payment estimates.', 'Review the estimated monthly payment, total paid, and interest.'],
		faqs: [
			{ question: 'How is the monthly payment estimated?', answer: 'The estimate uses a standard fixed-payment amortization formula with monthly payments and a constant annual interest rate.' },
			{ question: 'Are fees or changing interest rates included?', answer: 'No. This estimate excludes fees, taxes, insurance, and rate changes. Check your lender’s offer for exact repayment terms.' },
		],
		component: 'LoanRepaymentCalculator',
		icon: '$',
		live: true,
	},
	{
		slug: 'age-calculator',
		name: 'Age Calculator',
		department: 'calculators',
		description: 'Find an age in years, months, and days for any date.',
		seoTitle: 'Free Age Calculator',
		seoDescription: 'Calculate an exact age in years, months, and days between a birth date and any chosen date with this free age calculator.',
		howTo: ['Choose a date of birth.', 'Optionally choose the date to calculate age on; it defaults to today.', 'Read the age in years, months, and days.'],
		faqs: [
			{ question: 'Can I calculate age on a past or future date?', answer: 'You can choose any valid date on or after the birth date to calculate the age as of that day.' },
			{ question: 'Does the calculator account for leap years?', answer: 'Yes. Calendar dates use leap-year rules. For a February 29 birthday, the age anniversary is treated as February 28 in non-leap years.' },
		],
		component: 'AgeCalculator',
		icon: '◷',
		live: true,
	},
	{
		slug: 'character-counter',
		name: 'Character Counter',
		department: 'text',
		description: 'Count characters with and without spaces as you type.',
		seoTitle: 'Free Online Character Counter',
		seoDescription: 'Count characters, characters without spaces, words, and lines instantly with this free, private browser-based character counter.',
		howTo: ['Type or paste your text into the box.', 'See the live character totals with and without spaces.', 'Use the word and line counts for a quick text check.'],
		faqs: [
			{ question: 'Are spaces included in the character count?', answer: 'The tool shows both totals: one including spaces and one excluding whitespace.' },
			{ question: 'How are emoji counted?', answer: 'The counter treats each Unicode code point as a character, so some compound emoji may count as more than one.' },
		],
		component: 'CharacterCounter',
		icon: 'Aa',
		live: true,
	},
	{
		slug: 'date-difference-calculator',
		name: 'Date Difference Calculator',
		department: 'calculators',
		description: 'Find the calendar gap between two dates, plus total days and weeks.',
		seoTitle: 'Free Date Difference Calculator',
		seoDescription: 'Calculate the difference between two dates in years, months, days, total days, and weeks with this free browser-based date calculator.',
		howTo: ['Choose a start date and an end date.', 'The calculator orders dates automatically, whichever comes first.', 'Read the calendar difference and total days and weeks.'],
		faqs: [
			{ question: 'Does the order of the dates matter?', answer: 'No. The calculator shows the positive gap between the two dates, regardless of which date is entered first.' },
			{ question: 'How are total weeks calculated?', answer: 'Total weeks are the total number of days divided by seven, shown to two decimal places.' },
		],
		component: 'DateDifferenceCalculator',
		icon: '↔',
		live: true,
	},
	{
		slug: 'compound-interest-calculator',
		name: 'Compound Interest Calculator',
		department: 'calculators',
		description: 'Estimate growth from compound interest and optional monthly deposits.',
		seoTitle: 'Free Compound Interest Calculator',
		seoDescription: 'Estimate a final balance and interest earned using your principal, annual rate, investment term, compounding frequency, and optional monthly contributions.',
		howTo: ['Enter your starting principal, annual rate, and investment years.', 'Choose how often interest compounds and optionally add a monthly contribution.', 'Review the estimated final balance and total interest earned.'],
		faqs: [
			{ question: 'What does compounding frequency mean?', answer: 'It is how often interest is added to the balance. More frequent compounding can change the final amount.' },
			{ question: 'Are monthly contributions included in interest?', answer: 'Yes. Contributions are added at the end of each month and can earn interest in later months.' },
		],
		component: 'CompoundInterestCalculator',
		icon: '∑',
		live: true,
	},
	{
		slug: 'unit-converter',
		name: 'Unit Converter',
		department: 'calculators',
		description: 'Convert length, weight, temperature, volume, area, and speed.',
		seoTitle: 'Free Online Unit Converter',
		seoDescription: 'Convert common units for length, weight, temperature, volume, area, and speed with this free unit converter that works in your browser.',
		howTo: ['Choose a measurement category.', 'Select the units to convert from and to, then enter a value.', 'Use Swap to reverse the selected units.'],
		faqs: [
			{ question: 'Which unit categories are supported?', answer: 'The converter includes length, weight, temperature, volume, area, and speed.' },
			{ question: 'Are temperature conversions handled differently?', answer: 'Yes. Celsius, Fahrenheit, and Kelvin use their standard offset formulas; other categories use unit scale factors.' },
		],
		component: 'UnitConverter',
		icon: '⇄',
		live: true,
	},
	{
		slug: 'remove-duplicate-lines',
		name: 'Remove Duplicate Lines',
		department: 'text',
		description: 'Deduplicate text lines with options for spaces, case, and ordering.',
		seoTitle: 'Free Duplicate Line Remover',
		seoDescription: 'Remove repeated lines from text. Choose whether to ignore case, trim spaces, and keep the original line order. Runs privately in your browser.',
		howTo: ['Paste or type text with one item per line.', 'Choose how duplicates are matched and whether to preserve order.', 'Copy the cleaned text or review the updated result.'],
		faqs: [
			{ question: 'Which duplicate is kept?', answer: 'The first matching line is kept. When trimming is enabled, the kept line is also trimmed.' },
			{ question: 'What happens when original order is turned off?', answer: 'Unique lines are sorted alphabetically after duplicate removal.' },
		],
		component: 'RemoveDuplicateLines',
		icon: '≡',
		live: true,
	},
	{
		slug: 'qr-code-generator',
		name: 'QR Code Generator',
		department: 'utilities',
		description: 'Create a downloadable QR code from text or a URL.',
		seoTitle: 'Free QR Code Generator',
		seoDescription: 'Create a QR code from text or a URL, customize its size and colors, then download it as a PNG or SVG. Generation happens in your browser.',
		howTo: ['Enter the text or URL you want to share.', 'Choose a size and foreground and background colors.', 'Generate the code and download it as a PNG or SVG.'],
		faqs: [
			{ question: 'Can I encode a website link?', answer: 'Yes. Enter a full URL, including its protocol such as https://, or enter any other short text.' },
			{ question: 'Is my text sent to a server?', answer: 'No. The QR code is generated locally in your browser using the qrcode library.' },
		],
		component: 'QrCodeGenerator',
		icon: '▦',
		live: true,
	},
	{
		slug: 'password-generator',
		name: 'Password Generator',
		department: 'security',
		description: 'Generate a random password with the character groups you choose.',
		seoTitle: 'Secure Random Password Generator',
		seoDescription: 'Generate a strong random password with adjustable length and character options. Randomness comes from your browser’s cryptographic random number generator.',
		howTo: ['Set a password length from 8 to 128 characters.', 'Choose which character types to include.', 'Generate a password and copy it when ready.'],
		faqs: [
			{ question: 'How are passwords generated?', answer: 'The generator uses the browser’s Web Crypto API (crypto.getRandomValues), not Math.random.' },
			{ question: 'Is my generated password stored or sent anywhere?', answer: 'No. It is generated and displayed only in your browser; avoid sharing it and store it in a trusted password manager.' },
		],
		component: 'PasswordGenerator',
		icon: '✳',
		live: true,
	},
	{
		slug: 'image-compressor',
		name: 'Image Compressor',
		department: 'image',
		description: 'Reduce an image file size locally and compare before and after.',
		seoTitle: 'Private Online Image Compressor',
		seoDescription: 'Compress JPG, PNG, or WebP images in your browser, compare file sizes, and download the result. Your images never leave your device.',
		howTo: ['Choose a JPG, PNG, or WebP image from your device.', 'Adjust the quality slider and select Compress image.', 'Compare the file sizes and download the compressed copy.'],
		faqs: [
			{ question: 'Are my images uploaded?', answer: 'No. Image decoding and compression use your browser’s Canvas API; the image never leaves your device.' },
			{ question: 'Does the quality slider affect PNG files?', answer: 'Browsers do not apply lossy quality settings to PNG encoding, so the slider affects JPG and WebP output but not PNG.' },
		],
		component: 'ImageCompressor',
		icon: '▧',
		live: true,
	},
	{
		slug: 'image-resizer',
		name: 'Image Resizer',
		department: 'image',
		description: 'Resize JPG, PNG, or WebP images by dimensions or percentage.',
		seoTitle: 'Private Online Image Resizer',
		seoDescription: 'Resize JPG, PNG, and WebP images by width and height or by percentage, optionally lock the aspect ratio, and download locally processed results.',
		howTo: ['Select an image from your device.', 'Set its new dimensions or enter a resize percentage; optionally lock the ratio.', 'Resize and download your image.'],
		faqs: [
			{ question: 'Are images uploaded when resizing?', answer: 'No. Resizing uses the Canvas API in your browser, and your image stays on your device.' },
			{ question: 'What does aspect-ratio lock do?', answer: 'When enabled, changing width or height automatically adjusts the other dimension to preserve the original proportions.' },
		],
		component: 'ImageResizer',
		icon: '↗',
		live: true,
	},
	{
		slug: 'roi-calculator',
		name: 'ROI Calculator',
		department: 'calculators',
		description: 'Calculate net profit and return on investment as a percentage.',
		seoTitle: 'Free Return on Investment Calculator',
		seoDescription: 'Calculate net profit and ROI from an initial investment and its total return with this free browser-based ROI calculator.',
		howTo: ['Enter the initial amount invested.', 'Enter the total value or proceeds received from that investment.', 'Review net profit and return on investment as a percentage.'],
		faqs: [
			{ question: 'How is ROI calculated?', answer: 'ROI is (total return minus initial investment) divided by the initial investment, multiplied by 100.' },
			{ question: 'Does ROI include fees or the time invested?', answer: 'No. This simple calculation excludes fees, taxes, and time; it is not financial advice.' },
		],
		component: 'RoiCalculator',
		icon: '↗',
		live: true,
	},
	{
		slug: 'bmi-calculator',
		name: 'BMI Calculator',
		department: 'calculators',
		description: 'Calculate body mass index using metric or imperial measurements.',
		seoTitle: 'Free BMI Calculator (Metric and Imperial)',
		seoDescription: 'Calculate body mass index from your height and weight using metric or imperial units, with a general adult BMI category guide.',
		howTo: ['Choose metric or imperial units.', 'Enter your height and weight.', 'Review your BMI and the general adult category range.'],
		faqs: [
			{ question: 'Can I switch between metric and imperial?', answer: 'Yes. Choose either unit system and enter height and weight in the displayed units.' },
			{ question: 'Is BMI a medical diagnosis?', answer: 'No. BMI is a general screening measure for adults and does not account for individual factors. Consult a qualified health professional for personal advice.' },
		],
		component: 'BmiCalculator',
		icon: '◉',
		live: true,
	},
	{
		slug: 'simple-interest-calculator',
		name: 'Simple Interest Calculator',
		department: 'calculators',
		description: 'Calculate simple interest and the total amount over a chosen period.',
		seoTitle: 'Free Simple Interest Calculator',
		seoDescription: 'Calculate simple interest and total amount from principal, annual interest rate, and time in years or months with this free calculator.',
		howTo: ['Enter the principal and annual interest rate.', 'Enter the time and choose years or months.', 'Review the simple interest earned and total amount.'],
		faqs: [
			{ question: 'How is simple interest calculated?', answer: 'Simple interest is principal multiplied by the annual rate and time in years. Interest is calculated only on the original principal.' },
			{ question: 'Can I enter time in months?', answer: 'Yes. Months are converted to a fraction of a year for the calculation.' },
		],
		component: 'SimpleInterestCalculator',
		icon: '$',
		live: true,
	},
	{
		slug: 'date-add-subtract-calculator',
		name: 'Date Addition and Subtraction Calculator',
		department: 'calculators',
		description: 'Add or subtract days, weeks, months, or years from a date.',
		seoTitle: 'Free Date Addition and Subtraction Calculator',
		seoDescription: 'Add or subtract days, weeks, months, or years from a chosen date. Month-end and leap-year dates are handled in your browser.',
		howTo: ['Choose a starting date and whether to add or subtract.', 'Enter a whole number and select days, weeks, months, or years.', 'See the resulting calendar date.'],
		faqs: [
			{ question: 'What happens when the new month is shorter?', answer: 'The result uses the final valid day of that month. For example, adding one month to January 31 lands on the last day of February.' },
			{ question: 'Are leap years handled?', answer: 'Yes. Calendar arithmetic follows leap-year rules and clamps February 29 to February 28 when needed.' },
		],
		component: 'DateAddSubtractCalculator',
		icon: '±',
		live: true,
	},
	{
		slug: 'time-zone-converter',
		name: 'Time Zone Converter',
		department: 'calculators',
		description: 'Convert a local date and time between searchable time zones.',
		seoTitle: 'Free Time Zone Converter',
		seoDescription: 'Convert a date and time between searchable IANA time zones using your browser’s Intl API, with daylight saving time rules applied automatically.',
		howTo: ['Choose a date, time, and source time zone.', 'Search for and add the destination time zones you need.', 'Review each converted local time and its UTC offset.'],
		faqs: [
			{ question: 'Does the converter account for daylight saving time?', answer: 'Yes. The browser’s time-zone database applies the selected zone’s rules for the chosen date.' },
			{ question: 'What if a local time does not exist due to a clock change?', answer: 'The converter reports that the time is invalid in that zone. If a clock change repeats a time, the earlier occurrence is used.' },
		],
		component: 'TimeZoneConverter',
		icon: '◷',
		live: true,
	},
	{
		slug: 'reading-time-calculator',
		name: 'Reading Time Calculator',
		department: 'text',
		description: 'Estimate reading and speaking time from pasted text.',
		seoTitle: 'Free Reading Time Calculator',
		seoDescription: 'Estimate how long text takes to read or speak from its word count. Reading time assumes 225 words per minute and speaking time assumes 130 words per minute.',
		howTo: ['Paste or type text into the box.', 'See the word count and estimated reading and speaking times.', 'Edit the text to update the estimates instantly.'],
		faqs: [
			{ question: 'What reading speed is used?', answer: 'Reading time assumes 225 words per minute. Speaking time assumes 130 words per minute; actual pace varies by person and material.' },
			{ question: 'Is my text uploaded?', answer: 'No. The word count and time estimates are calculated locally in your browser.' },
		],
		component: 'ReadingTimeCalculator',
		icon: '◴',
		live: true,
	},
	{
		slug: 'sentence-paragraph-counter',
		name: 'Sentence and Paragraph Counter',
		department: 'text',
		description: 'Count sentences and paragraphs, plus words and characters.',
		seoTitle: 'Free Sentence and Paragraph Counter',
		seoDescription: 'Count sentences, paragraphs, words, and characters in your text instantly with this free, private browser-based counter.',
		howTo: ['Paste or type text into the box.', 'Review the live sentence, paragraph, word, and character counts.', 'Edit the text to update the totals.'],
		faqs: [
			{ question: 'How are paragraphs counted?', answer: 'A paragraph is a non-empty block of text separated from another block by one or more blank lines.' },
			{ question: 'How are sentences counted?', answer: 'Sentence endings such as periods, question marks, and exclamation marks are counted when followed by whitespace or the end of the text.' },
		],
		component: 'SentenceParagraphCounter',
		icon: '¶',
		live: true,
	},
	{
		slug: 'sort-text-alphabetically',
		name: 'Sort Text Alphabetically',
		department: 'text',
		description: 'Sort lines A–Z or Z–A with case, number, and blank-line options.',
		seoTitle: 'Free Alphabetical Text Sorter',
		seoDescription: 'Sort text lines A–Z or Z–A, ignore case, use numeric sorting, and remove blank lines with this free browser-based text sorter.',
		howTo: ['Paste one item per line.', 'Choose sort direction and options.', 'Copy or select the sorted lines from the result.'],
		faqs: [
			{ question: 'What does numeric sort do?', answer: 'Numeric sorting compares number sequences by numeric value, so “item 2” comes before “item 10”.' },
			{ question: 'Is the original text changed?', answer: 'No. The sorter creates a separate result and processes all text locally in your browser.' },
		],
		component: 'SortTextAlphabetically',
		icon: 'A↕',
		live: true,
	},
	{
		slug: 'find-and-replace-text',
		name: 'Find and Replace Text',
		department: 'text',
		description: 'Find and replace text with case, whole-word, or regex options.',
		seoTitle: 'Free Find and Replace Text Tool',
		seoDescription: 'Find and replace text with optional match-case, whole-word, and regular-expression modes. See the replacement count and copy the result.',
		howTo: ['Paste your text and enter the phrase to find and its replacement.', 'Choose matching options; enable regex mode only for a valid pattern.', 'Review the replacement count and copy the result.'],
		faqs: [
			{ question: 'What does regex mode do?', answer: 'It treats the find field as a JavaScript regular expression. Invalid patterns are reported, and no replacement is made.' },
			{ question: 'Is my text sent to a server?', answer: 'No. Finding and replacing text happens entirely in your browser.' },
		],
		component: 'FindReplaceText',
		icon: '↔',
		live: true,
	},
	{
		slug: 'text-to-slug-converter',
		name: 'Text to Slug Converter',
		department: 'text',
		description: 'Create a lowercase, accent-free slug with your chosen separator.',
		seoTitle: 'Free Text to Slug Converter',
		seoDescription: 'Convert text into a lowercase, URL-friendly slug by removing accents and symbols and choosing a hyphen, underscore, or space separator.',
		howTo: ['Enter or paste the text you want to convert.', 'Choose a separator for words.', 'Copy or select the generated slug.'],
		faqs: [
			{ question: 'How are accents and symbols handled?', answer: 'Accented letters are converted to their base letters, and symbols or punctuation are removed from the slug.' },
			{ question: 'Can I use a separator other than a hyphen?', answer: 'Yes. Choose a hyphen, underscore, or space as the word separator.' },
		],
		component: 'TextToSlugConverter',
		icon: '#',
		live: true,
	},
	{
		slug: 'logo-studio',
		name: 'Logo Studio',
		department: 'logo',
		description: 'Create, edit, and export a vector logo while keeping your work on this device.',
		seoTitle: 'Private Logo Studio and SVG Logo Editor',
		seoDescription: 'Design a vector logo with text, shapes, and bundled fonts. Save projects and export SVG, PNG, JPG, or PDF; everything stays on your device.',
		howTo: ['Add text or a shape to the artboard.', 'Select an element to edit its style, size, and position.', 'Open Export Centre to download a design or save the editable project file.'],
		faqs: [
			{ question: 'Does anything leave my device?', answer: 'No. Your design, autosaved projects, fonts, and exports are processed locally in your browser.' },
			{ question: 'Can I reopen an editable project?', answer: 'Yes. Use My Projects for local copies or export a project file to open later.' },
		],
		component: 'LogoStudioApp',
		icon: '?',
		live: false,
	},
];

export const liveTools = tools.filter((tool) => tool.live);
