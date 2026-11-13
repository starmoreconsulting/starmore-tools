import { useState } from 'react';

type DateUnit = 'days' | 'weeks' | 'months' | 'years';
type Operation = 'add' | 'subtract';

interface CalendarDate {
	year: number;
	month: number;
	day: number;
}

function parseDate(value: string): CalendarDate | null {
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

function daysInMonth(year: number, month: number) {
	const date = new Date(0);
	date.setUTCFullYear(year, month, 0);
	return date.getUTCDate();
}

function formatDate(date: CalendarDate) {
	return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function calculateDate(date: CalendarDate, amount: number, unit: DateUnit, operation: Operation): CalendarDate | null {
	const direction = operation === 'add' ? 1 : -1;
	const result = { ...date };
	if (unit === 'days' || unit === 'weeks') {
		const days = amount * (unit === 'weeks' ? 7 : 1) * direction;
		const value = new Date(0);
		value.setUTCFullYear(date.year, date.month - 1, date.day + days);
		value.setUTCHours(0, 0, 0, 0);
		if (!Number.isFinite(value.getTime())) return null;
		result.year = value.getUTCFullYear();
		result.month = value.getUTCMonth() + 1;
		result.day = value.getUTCDate();
	} else {
		const monthDelta = amount * (unit === 'years' ? 12 : 1) * direction;
		const monthIndex = date.year * 12 + date.month - 1 + monthDelta;
		result.year = Math.floor(monthIndex / 12);
		result.month = monthIndex % 12 + 1;
		result.day = Math.min(date.day, daysInMonth(result.year, result.month));
	}
	return result.year >= 1 && result.year <= 9999 ? result : null;
}

export default function DateAddSubtractCalculator() {
	const [dateInput, setDateInput] = useState('');
	const [amount, setAmount] = useState('');
	const [unit, setUnit] = useState<DateUnit>('days');
	const [operation, setOperation] = useState<Operation>('add');
	const date = parseDate(dateInput);
	const amountValue = amount.trim() === '' ? null : Number(amount);
	const complete = dateInput.trim() !== '' && amount.trim() !== '';
	const validInput = date !== null && amountValue !== null && Number.isSafeInteger(amountValue) && amountValue >= 0 && amountValue <= 1_000_000;
	const result = validInput ? calculateDate(date, amountValue!, unit, operation) : null;

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="date-add-base">Starting date</label>
					<input id="date-add-base" type="date" value={dateInput} onChange={(event) => setDateInput(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="date-add-operation">Operation</label>
					<select id="date-add-operation" value={operation} onChange={(event) => setOperation(event.target.value as Operation)}>
						<option value="add">Add</option>
						<option value="subtract">Subtract</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="date-add-amount">Amount (whole number)</label>
					<input id="date-add-amount" type="number" min="0" max="1000000" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="30" />
				</div>
				<div className="calc-field">
					<label htmlFor="date-add-unit">Unit</label>
					<select id="date-add-unit" value={unit} onChange={(event) => setUnit(event.target.value as DateUnit)}>
						<option value="days">Days</option>
						<option value="weeks">Weeks</option>
						<option value="months">Months</option>
						<option value="years">Years</option>
					</select>
				</div>
			</div>
			<div className="calc-result-grid">
				<div className="calc-result featured">
					<span className="calc-label">RESULTING DATE</span>
					<strong>{result ? formatDate(result) : '—'}</strong>
				</div>
			</div>
			<p className={`tool-message${complete && (!validInput || result === null) ? ' error' : ''}`} role="status">
				{complete && (!validInput || result === null) ? 'Choose a valid date and a whole number from 0 to 1,000,000.'
					: result ? `${operation === 'add' ? 'Added' : 'Subtracted'} ${amountValue} ${unit}.`
						: 'Choose a date, operation, amount, and calendar unit.'}
			</p>
		</div>
	);
}
