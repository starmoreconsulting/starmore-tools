import { useState } from 'react';

interface CalendarDate {
	year: number;
	month: number;
	day: number;
}

function daysInMonth(year: number, month: number) {
	if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
	return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseDate(value: string): CalendarDate | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
	return { year, month, day };
}

function getToday() {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function compareDates(first: CalendarDate, second: CalendarDate) {
	if (first.year !== second.year) return first.year - second.year;
	if (first.month !== second.month) return first.month - second.month;
	return first.day - second.day;
}

function addMonths(date: CalendarDate, monthsToAdd: number): CalendarDate {
	const monthIndex = date.year * 12 + date.month - 1 + monthsToAdd;
	const year = Math.floor(monthIndex / 12);
	const month = monthIndex % 12 + 1;
	return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

function dayNumber(date: CalendarDate) {
	const utcDate = new Date(0);
	utcDate.setUTCFullYear(date.year, date.month - 1, date.day);
	utcDate.setUTCHours(0, 0, 0, 0);
	return Math.floor(utcDate.getTime() / 86_400_000);
}

function calculateAge(birthDate: CalendarDate, asOfDate: CalendarDate) {
	let years = asOfDate.year - birthDate.year;
	const anniversaryBirthDate = birthDate.month === 2 && birthDate.day === 29
		? { ...birthDate, day: 28 }
		: birthDate;
	let yearAnniversary = addMonths(anniversaryBirthDate, years * 12);
	if (compareDates(yearAnniversary, asOfDate) > 0) {
		years -= 1;
		yearAnniversary = addMonths(anniversaryBirthDate, years * 12);
	}

	let months = (asOfDate.year - yearAnniversary.year) * 12 + asOfDate.month - yearAnniversary.month;
	let monthAnniversary = addMonths(yearAnniversary, months);
	if (compareDates(monthAnniversary, asOfDate) > 0) {
		months -= 1;
		monthAnniversary = addMonths(yearAnniversary, months);
	}

	return { years, months, days: dayNumber(asOfDate) - dayNumber(monthAnniversary) };
}

export default function AgeCalculator() {
	const [birth, setBirth] = useState('');
	const [asOf, setAsOf] = useState(getToday);
	const birthDate = parseDate(birth);
	const asOfDate = parseDate(asOf);
	const complete = birth.trim() !== '' && asOf.trim() !== '';
	const valid = complete && birthDate !== null && asOfDate !== null
		&& compareDates(asOfDate, birthDate) >= 0;
	const age = valid ? calculateAge(birthDate!, asOfDate!) : null;

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="age-birth">Date of birth</label>
					<input id="age-birth" type="date" value={birth} onChange={(event) => setBirth(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="age-as-of">Age at date</label>
					<input id="age-as-of" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
				</div>
			</div>
			<div className="calc-result-grid three-columns" aria-live="polite">
				<div className="calc-result featured">
					<span className="calc-label">YEARS</span>
					<strong>{age?.years ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">MONTHS</span>
					<strong>{age?.months ?? '—'}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">DAYS</span>
					<strong>{age?.days ?? '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && !valid ? ' error' : ''}`} role="status">
				{complete && !valid ? 'Choose valid dates, with the age-at date on or after the date of birth.'
					: valid ? 'Age is shown in calendar years, months, and days.'
						: 'Choose a date of birth to calculate age in calendar years, months, and days.'}
			</p>
		</div>
	);
}
