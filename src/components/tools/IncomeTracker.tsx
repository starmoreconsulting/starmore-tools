import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	addIncome,
	createIncomeCsv,
	decodeIncomeStorage,
	encodeIncomeStorage,
	filterIncomeByMonth,
	INCOME_TRACKER_CATEGORIES,
	INCOME_TRACKER_STORAGE_KEY,
	removeIncome,
	summarizeIncome,
	validateIncomeDraft,
	type IncomeDraft,
	type IncomeEntry,
} from '../../engines/income-tracker';
import {
	EXPENSE_TRACKER_CURRENCIES,
	EXPENSE_TRACKER_PAYMENT_METHODS,
	isOneOf,
	type ExpenseTrackerCurrency,
	type ExpenseTrackerPaymentMethod,
} from '../../engines/expense-tracker';
import { triggerDownload } from '../../engines/pdf';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function currentMonthString(date: Date): string {
	return localDateString(date).slice(0, 7);
}

function formatAmount(amount: number, currency: string): string {
	return `${currency} ${new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
}

function initialDraft(): IncomeDraft {
	return {
		date: localDateString(new Date()),
		description: '',
		category: 'Sales',
		amount: 0,
		currency: 'NGN',
		paymentMethod: 'Bank transfer',
		source: '',
		reference: '',
	};
}

export default function IncomeTracker() {
	const [entries, setEntries] = useState<IncomeEntry[]>([]);
	const [draft, setDraft] = useState(initialDraft);
	const [month, setMonth] = useState(() => currentMonthString(new Date()));
	const [message, setMessage] = useState('Loading income saved in this browser.');
	const [isError, setIsError] = useState(false);
	const [storageReady, setStorageReady] = useState(false);

	useEffect(() => {
		try {
			setEntries(decodeIncomeStorage(localStorage.getItem(INCOME_TRACKER_STORAGE_KEY)));
			setMessage('Income is stored only in this browser on this device.');
			setStorageReady(true);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not restore saved income.');
			setIsError(true);
		}
	}, []);

	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(INCOME_TRACKER_STORAGE_KEY, encodeIncomeStorage(entries));
		} catch {
			setMessage('Could not save income in this browser. Export a CSV backup before leaving this page.');
			setIsError(true);
		}
	}, [entries, storageReady]);

	const visibleEntries = useMemo(() => filterIncomeByMonth(entries, month), [entries, month]);
	const totals = useMemo(() => summarizeIncome(visibleEntries), [visibleEntries]);
	const updateDraft = <K extends keyof IncomeDraft>(key: K, value: IncomeDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const addEntry = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			validateIncomeDraft(draft);
			setEntries(addIncome(entries, draft));
			setDraft({ ...initialDraft(), date: draft.date, currency: draft.currency, category: draft.category, paymentMethod: draft.paymentMethod });
			setMessage(storageReady
				? 'Income added and saved in this browser.'
				: 'Income added for this session only because saved browser data could not be read. Export a CSV backup.');
			setIsError(!storageReady);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this income.');
			setIsError(true);
		}
	};

	const deleteEntry = (id: string) => {
		setEntries((current) => removeIncome(current, id));
		setMessage('Income entry removed.');
		setIsError(false);
	};

	const exportCsv = () => {
		if (entries.length === 0) return;
		const csv = createIncomeCsv(entries);
		const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
		triggerDownload(blob, `starmore-income-${localDateString(new Date())}.csv`);
		setMessage(`Exported ${entries.length} income entr${entries.length === 1 ? 'y' : 'ies'} as CSV.`);
		setIsError(false);
	};

	return (
		<div>
			<form className="expense-entry-form" onSubmit={addEntry}>
				<div className="expense-entry-fields">
					<div className="calc-field">
						<label htmlFor="income-date">Date received</label>
						<input id="income-date" type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor="income-description">Description</label>
						<input id="income-description" maxLength={200} required value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} placeholder="What was this income for?" />
					</div>
					<div className="calc-field">
						<label htmlFor="income-category">Income category</label>
						<select id="income-category" value={draft.category} onChange={(event) => {
							if (isOneOf(event.target.value, INCOME_TRACKER_CATEGORIES)) updateDraft('category', event.target.value);
						}}>
							{INCOME_TRACKER_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="income-amount">Amount received</label>
						<input id="income-amount" type="number" min="0.01" step="0.01" required value={draft.amount || ''} onChange={(event) => updateDraft('amount', event.target.value === '' ? 0 : Number(event.target.value))} placeholder="0.00" />
					</div>
					<div className="calc-field">
						<label htmlFor="income-currency">Currency</label>
						<select id="income-currency" value={draft.currency} onChange={(event) => {
							if (isOneOf(event.target.value, EXPENSE_TRACKER_CURRENCIES)) updateDraft('currency', event.target.value);
						}}>
							{EXPENSE_TRACKER_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="income-payment">Payment method</label>
						<select id="income-payment" value={draft.paymentMethod} onChange={(event) => {
							if (isOneOf(event.target.value, EXPENSE_TRACKER_PAYMENT_METHODS)) updateDraft('paymentMethod', event.target.value);
						}}>
							{EXPENSE_TRACKER_PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="income-source">Customer / source (optional)</label>
						<input id="income-source" maxLength={120} value={draft.source} onChange={(event) => updateDraft('source', event.target.value)} placeholder="Customer, platform, or source" />
					</div>
					<div className="calc-field">
						<label htmlFor="income-reference">Invoice / transaction reference (optional)</label>
						<input id="income-reference" maxLength={120} value={draft.reference} onChange={(event) => updateDraft('reference', event.target.value)} placeholder="Invoice number or transaction ID" />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button" type="submit">Add income</button>
				</div>
			</form>

			<section className="expense-ledger" aria-label="Income ledger">
				<div className="expense-ledger-header">
					<div>
						<h2>Income ledger</h2>
						<p>{entries.length} recorded income entr{entries.length === 1 ? 'y' : 'ies'}</p>
					</div>
					<div className="expense-ledger-actions">
						<div className="calc-field">
							<label htmlFor="income-month">Show month</label>
							<input id="income-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
						</div>
						<button className="tool-button secondary" type="button" disabled={!entries.length} onClick={exportCsv}>Export all CSV</button>
					</div>
				</div>
				<div className="expense-total-cards" aria-label="Monthly income totals by currency">
					{totals.size ? [...totals.entries()].map(([currency, amount]) => (
						<div className="expense-total-card income-total-card" key={currency}><span>{month || 'All dates'} · {currency} income</span><strong>{formatAmount(amount, currency)}</strong></div>
					)) : <div className="expense-total-card"><span>{month || 'All dates'} · income</span><strong>No income</strong></div>}
				</div>
				{visibleEntries.length ? (
					<div className="expense-table-wrap">
						<table className="expense-table income-table">
							<thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Source</th><th>Reference</th><th>Payment</th><th>Amount</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
							<tbody>{visibleEntries.map((entry) => (
								<tr key={entry.id}>
									<td>{entry.date}</td>
									<td>{entry.description}</td>
									<td>{entry.category}</td>
									<td>{entry.source || '—'}</td>
									<td>{entry.reference || '—'}</td>
									<td>{entry.paymentMethod}</td>
									<td>{formatAmount(entry.amount, entry.currency)}</td>
									<td><button className="expense-delete-button" type="button" aria-label={`Delete ${entry.description}`} onClick={() => deleteEntry(entry.id)}>Delete</button></td>
								</tr>
							))}</tbody>
						</table>
					</div>
				) : <p className="expense-empty-state">{entries.length ? 'No income recorded for this month.' : 'No income yet. Add your first income entry above.'}</p>}
			</section>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="expense-privacy-note">Income records are saved in this browser on this device only. They are not synced or backed up. Export CSV regularly to keep a separate copy. This ledger does not verify payments or calculate tax obligations.</p>
		</div>
	);
}
