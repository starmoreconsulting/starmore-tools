import { useState } from 'react';
import { formatValue } from '../../engines/calculator-format';

interface DateParts {
	year: number;
	month: number;
	day: number;
}

function parseDate(value: string): DateParts | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);
	date.setUTCHours(0, 0, 0, 0);
	if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
	return { year, month, day };
}

function toDayNumber(date: DateParts) {
	const utc = new Date(0);
	utc.setUTCFullYear(date.year, date.month - 1, date.day);
	utc.setUTCHours(0, 0, 0, 0);
	return Math.floor(utc.getTime() / 86_400_000);
}

function daysInMonth(year: number, month: number) {
	const date = new Date(0);
	date.setUTCFullYear(year, month, 0);
	return date.getUTCDate();
}

function addMonths(date: DateParts, months: number): DateParts {
	const monthIndex = date.year * 12 + date.month - 1 + months;
	const year = Math.floor(monthIndex / 12);
	const month = monthIndex % 12 + 1;
	return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

function compare(first: DateParts, second: DateParts) {
	return toDayNumber(first) - toDayNumber(second);
}

function difference(start: DateParts, end: DateParts) {
	let years = end.year - start.year;
	let anniversary = addMonths(start, years * 12);
	if (compare(anniversary, end) > 0) {
		years -= 1;
		anniversary = addMonths(start, years * 12);
	}

	let months = (end.year - anniversary.year) * 12 + end.month - anniversary.month;
	let monthAnniversary = addMonths(anniversary, months);
	if (compare(monthAnniversary, end) > 0) {
		months -= 1;
		monthAnniversary = addMonths(anniversary, months);
	}

	const days = toDayNumber(end) - toDayNumber(monthAnniversary);
	const totalDays = toDayNumber(end) - toDayNumber(start);
	return { years, months, days, totalDays };
}

export default function DateDifferenceCalculator() {
	const [firstDate, setFirstDate] = useState('');
	const [secondDate, setSecondDate] = useState('');
	const first = parseDate(firstDate);
	const second = parseDate(secondDate);
	const valid = first !== null && second !== null;
	const result = valid
		? compare(first, second) <= 0 ? difference(first, second) : difference(second, first)
		: null;

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="date-diff-first">Start date</label>
					<input id="date-diff-first" type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="date-diff-second">End date</label>
					<input id="date-diff-second" type="date" value={secondDate} onChange={(event) => setSecondDate(event.target.value)} />
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">YEARS</span>
					<strong>{result?.years ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">MONTHS</span>
					<strong>{result?.months ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">DAYS</span>
					<strong>{result?.days ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL DAYS</span>
					<strong>{result?.totalDays ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL WEEKS</span>
					<strong>{result ? formatValue(result.totalDays / 7) : '—'}</strong>
				</div>
			</div>
			<p className="tool-message" role="status">
				{result ? 'Total days count elapsed days from the earlier date to the later date.' : 'Choose two valid dates to see the difference.'}
			</p>
		</div>
	);
}
