import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	addExpense,
	createExpenseCsv,
	decodeExpenseStorage,
	EXPENSE_TRACKER_CATEGORIES,
	EXPENSE_TRACKER_CURRENCIES,
	EXPENSE_TRACKER_PAYMENT_METHODS,
	EXPENSE_TRACKER_STORAGE_KEY,
	filterExpensesByMonth,
	removeExpense,
	summarizeExpenses,
	type ExpenseDraft,
	type ExpenseEntry,
	type ExpenseTrackerCategory,
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

function initialDraft(): ExpenseDraft {
	return {
		date: localDateString(new Date()),
		description: '',
		category: 'Office supplies',
		amount: 0,
		currency: 'NGN',
		paymentMethod: 'Bank transfer',
		vendor: '',
	};
}

function isExpenseCategory(value: string): value is ExpenseTrackerCategory {
	return EXPENSE_TRACKER_CATEGORIES.some((category) => category === value);
}

function isExpenseCurrency(value: string): value is ExpenseTrackerCurrency {
	return EXPENSE_TRACKER_CURRENCIES.some((currency) => currency === value);
}

function isPaymentMethod(value: string): value is ExpenseTrackerPaymentMethod {
	return EXPENSE_TRACKER_PAYMENT_METHODS.some((method) => method === value);
}

export default function ExpenseTracker() {
	const [entries, setEntries] = useState<ExpenseEntry[]>([]);
	const [draft, setDraft] = useState(initialDraft);
	const [month, setMonth] = useState(() => currentMonthString(new Date()));
	const [message, setMessage] = useState('Loading expenses saved in this browser.');
	const [isError, setIsError] = useState(false);
	const [storageReady, setStorageReady] = useState(false);

	useEffect(() => {
		try {
			setEntries(decodeExpenseStorage(localStorage.getItem(EXPENSE_TRACKER_STORAGE_KEY)));
			setMessage('Expenses are stored only in this browser on this device.');
			setStorageReady(true);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not restore saved expenses.');
			setIsError(true);
		}
	}, []);

	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(EXPENSE_TRACKER_STORAGE_KEY, JSON.stringify(entries));
		} catch {
			setMessage('Could not save expenses in this browser. Export a CSV backup before leaving this page.');
			setIsError(true);
		}
	}, [entries, storageReady]);

	const visibleEntries = useMemo(() => filterExpensesByMonth(entries, month), [entries, month]);
	const totals = useMemo(() => summarizeExpenses(visibleEntries), [visibleEntries]);
	const updateDraft = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
		setDraft((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const addEntry = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const nextEntries = addExpense(entries, draft);
			setEntries(nextEntries);
			setDraft({ ...initialDraft(), date: draft.date, currency: draft.currency, category: draft.category, paymentMethod: draft.paymentMethod });
			setMessage(storageReady
				? 'Expense added and saved in this browser.'
				: 'Expense added for this session only because saved browser data could not be read. Export a CSV backup.');
			setIsError(!storageReady);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this expense.');
			setIsError(true);
		}
	};

	const deleteEntry = (id: string) => {
		setEntries((current) => removeExpense(current, id));
		setMessage('Expense removed.');
		setIsError(false);
	};

	const exportCsv = () => {
		if (entries.length === 0) return;
		const csv = createExpenseCsv(entries);
		const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
		triggerDownload(blob, `starmore-expenses-${localDateString(new Date())}.csv`);
		setMessage(`Exported ${entries.length} expense${entries.length === 1 ? '' : 's'} as CSV.`);
		setIsError(false);
	};

	return (
		<div>
			<form className="expense-entry-form" onSubmit={addEntry}>
				<div className="expense-entry-fields">
					<div className="calc-field">
						<label htmlFor="expense-date">Date</label>
						<input id="expense-date" type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} />
					</div>
					<div className="calc-field">
						<label htmlFor="expense-description">Description</label>
						<input id="expense-description" maxLength={200} required value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} placeholder="What was this expense for?" />
					</div>
					<div className="calc-field">
						<label htmlFor="expense-category">Category</label>
						<select id="expense-category" value={draft.category} onChange={(event) => {
							if (isExpenseCategory(event.target.value)) updateDraft('category', event.target.value);
						}}>
							{EXPENSE_TRACKER_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="expense-amount">Amount</label>
						<input id="expense-amount" type="number" min="0.01" step="0.01" required value={draft.amount || ''} onChange={(event) => updateDraft('amount', event.target.value === '' ? 0 : Number(event.target.value))} placeholder="0.00" />
					</div>
					<div className="calc-field">
						<label htmlFor="expense-currency">Currency</label>
						<select id="expense-currency" value={draft.currency} onChange={(event) => {
							if (isExpenseCurrency(event.target.value)) updateDraft('currency', event.target.value);
						}}>
							{EXPENSE_TRACKER_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="expense-payment">Payment method</label>
						<select id="expense-payment" value={draft.paymentMethod} onChange={(event) => {
							if (isPaymentMethod(event.target.value)) updateDraft('paymentMethod', event.target.value);
						}}>
							{EXPENSE_TRACKER_PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="expense-vendor">Vendor / payee (optional)</label>
						<input id="expense-vendor" maxLength={120} value={draft.vendor} onChange={(event) => updateDraft('vendor', event.target.value)} placeholder="Store, supplier, or person" />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button" type="submit">Add expense</button>
				</div>
			</form>

			<section className="expense-ledger" aria-label="Expense ledger">
				<div className="expense-ledger-header">
					<div>
						<h2>Expense ledger</h2>
						<p>{entries.length} recorded expense{entries.length === 1 ? '' : 's'}</p>
					</div>
					<div className="expense-ledger-actions">
						<div className="calc-field">
							<label htmlFor="expense-month">Show month</label>
							<input id="expense-month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
						</div>
						<button className="tool-button secondary" type="button" disabled={!entries.length} onClick={exportCsv}>Export all CSV</button>
					</div>
				</div>
				<div className="expense-total-cards" aria-label="Monthly totals by currency">
					{totals.size ? [...totals.entries()].map(([currency, amount]) => (
						<div className="expense-total-card" key={currency}><span>{month || 'All dates'} · {currency}</span><strong>{formatAmount(amount, currency)}</strong></div>
					)) : <div className="expense-total-card"><span>{month || 'All dates'} · total</span><strong>No expenses</strong></div>}
				</div>
				{visibleEntries.length ? (
					<div className="expense-table-wrap">
						<table className="expense-table">
							<thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor</th><th>Payment</th><th>Amount</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
							<tbody>{visibleEntries.map((entry) => (
								<tr key={entry.id}>
									<td>{entry.date}</td>
									<td>{entry.description}</td>
									<td>{entry.category}</td>
									<td>{entry.vendor || '—'}</td>
									<td>{entry.paymentMethod}</td>
									<td>{formatAmount(entry.amount, entry.currency)}</td>
									<td><button className="expense-delete-button" type="button" aria-label={`Delete ${entry.description}`} onClick={() => deleteEntry(entry.id)}>Delete</button></td>
								</tr>
							))}</tbody>
						</table>
					</div>
				) : <p className="expense-empty-state">{entries.length ? 'No expenses recorded for this month.' : 'No expenses yet. Add your first expense above.'}</p>}
			</section>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="expense-privacy-note">Your ledger is saved in this browser on this device. It is not synced or backed up. Export CSV regularly to keep a separate copy.</p>
		</div>
	);
}
