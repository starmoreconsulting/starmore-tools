import { useMemo, useState } from 'react';
import {
	calculateProfitLossStatement,
	createProfitLossStatementPdf,
	formatProfitLossStatementAmount,
	PROFIT_LOSS_EXPENSE_CATEGORIES,
	PROFIT_LOSS_INCOME_CATEGORIES,
	PROFIT_LOSS_STATEMENT_CURRENCIES,
	validateProfitLossStatement,
	type ProfitLossExpenseCategory,
	type ProfitLossIncomeCategory,
	type ProfitLossStatementInput,
	type ProfitLossStatementItem,
} from '../../engines/profit-loss-statement';
import { isOneOf } from '../../engines/expense-tracker';
import { triggerDownload } from '../../engines/pdf';

interface LineDraft<Category extends string> {
	category: Category;
	description: string;
	amount: number;
}

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialStatement(): ProfitLossStatementInput {
	const today = new Date();
	return {
		businessName: '',
		periodStart: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
		periodEnd: localDateString(today),
		currency: 'NGN',
		incomeItems: [],
		expenseItems: [],
		notes: '',
	};
}

function safeFilename(value: string): string {
	const name = value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60);
	return `${name || 'profit-loss-statement'}.pdf`;
}

function formatPeriod(value: string): string {
	if (!value) return '—';
	const date = new Date(`${value}T00:00:00`);
	return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

export default function ProfitLossStatementGenerator() {
	const [statement, setStatement] = useState(initialStatement);
	const [incomeDraft, setIncomeDraft] = useState<LineDraft<ProfitLossIncomeCategory>>({
		category: 'Sales',
		description: '',
		amount: 0,
	});
	const [expenseDraft, setExpenseDraft] = useState<LineDraft<ProfitLossExpenseCategory>>({
		category: 'Cost of goods sold',
		description: '',
		amount: 0,
	});
	const [message, setMessage] = useState('Enter statement details and add at least one income or expense line.');
	const [busy, setBusy] = useState(false);

	const summary = useMemo((): { totals: ReturnType<typeof calculateProfitLossStatement> | null; error: string | null } => {
		if (!statement.incomeItems.length && !statement.expenseItems.length) {
			return { totals: null, error: null };
		}
		try {
			return { totals: calculateProfitLossStatement(statement), error: null };
		} catch (error) {
			return {
				totals: null,
				error: error instanceof Error ? error.message : 'Could not calculate this statement.',
			};
		}
	}, [statement]);
	const { totals } = summary;

	const updateStatement = <K extends keyof ProfitLossStatementInput>(key: K, value: ProfitLossStatementInput[K]) => {
		setStatement((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const addItem = <Category extends string,>(
		section: 'incomeItems' | 'expenseItems',
		draft: LineDraft<Category>,
		setDraft: (next: LineDraft<Category>) => void,
	) => {
		try {
			const item: ProfitLossStatementItem<Category> = {
				...draft,
				description: draft.description.trim(),
				id: crypto.randomUUID(),
			};
			const nextStatement = { ...statement, [section]: [...statement[section], item] };
			validateProfitLossStatement(nextStatement);
			setStatement(nextStatement);
			setDraft({ ...draft, description: '', amount: 0 });
			setMessage(`${section === 'incomeItems' ? 'Income' : 'Expense'} line added.`);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this statement line.');
		}
	};

	const deleteItem = (section: 'incomeItems' | 'expenseItems', id: string) => {
		setStatement((current) => ({
			...current,
			[section]: current[section].filter((item) => item.id !== id),
		}));
		setMessage('Statement line removed.');
	};

	const downloadPdf = async () => {
		setBusy(true);
		setMessage('');
		try {
			const bytes = await createProfitLossStatementPdf(statement);
			triggerDownload(new Blob([bytes], { type: 'application/pdf' }), safeFilename(statement.businessName));
			setMessage('Profit and loss statement PDF downloaded.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not create the statement PDF.');
		} finally {
			setBusy(false);
		}
	};

	const renderLines = <Category extends string>(
		items: ProfitLossStatementItem<Category>[],
		section: 'incomeItems' | 'expenseItems',
	) => items.map((item) => (
		<tr key={item.id}>
			<td>{item.category}</td>
			<td>{item.description}</td>
			<td>{formatProfitLossStatementAmount(item.amount, statement.currency)}</td>
			<td><button className="expense-delete-button" type="button" aria-label={`Delete ${item.description}`} onClick={() => deleteItem(section, item.id)}>Delete</button></td>
		</tr>
	));

	const resultLabel = totals && totals.netProfit < 0 ? 'Net loss' : 'Net profit';

	return (
		<div>
			<div className="statement-columns">
				<section className="statement-form" aria-label="Statement details and line items">
					<div className="calc-fields">
						<div className="calc-field">
							<label htmlFor="statement-business">Business / organization name</label>
							<input id="statement-business" maxLength={120} value={statement.businessName} onChange={(event) => updateStatement('businessName', event.target.value)} placeholder="Your business" />
						</div>
						<div className="statement-period">
							<div className="calc-field">
								<label htmlFor="statement-start">Period start</label>
								<input id="statement-start" type="date" value={statement.periodStart} onChange={(event) => updateStatement('periodStart', event.target.value)} />
							</div>
							<div className="calc-field">
								<label htmlFor="statement-end">Period end</label>
								<input id="statement-end" type="date" value={statement.periodEnd} onChange={(event) => updateStatement('periodEnd', event.target.value)} />
							</div>
						</div>
						<div className="calc-field">
							<label htmlFor="statement-currency">Statement currency</label>
							<select id="statement-currency" value={statement.currency} onChange={(event) => {
								if (isOneOf(event.target.value, PROFIT_LOSS_STATEMENT_CURRENCIES)) updateStatement('currency', event.target.value);
							}}>
								{PROFIT_LOSS_STATEMENT_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
							</select>
						</div>
					</div>

					<section className="statement-entry-section" aria-label="Add income">
						<h2>Add income</h2>
						<div className="statement-entry-fields">
							<div className="calc-field">
								<label htmlFor="statement-income-category">Category</label>
								<select id="statement-income-category" value={incomeDraft.category} onChange={(event) => {
									if (isOneOf(event.target.value, PROFIT_LOSS_INCOME_CATEGORIES)) setIncomeDraft((current) => ({ ...current, category: event.target.value }));
								}}>
									{PROFIT_LOSS_INCOME_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
								</select>
							</div>
							<div className="calc-field">
								<label htmlFor="statement-income-description">Description</label>
								<input id="statement-income-description" maxLength={200} value={incomeDraft.description} onChange={(event) => setIncomeDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What was earned?" />
							</div>
							<div className="calc-field">
								<label htmlFor="statement-income-amount">Amount ({statement.currency})</label>
								<input id="statement-income-amount" type="number" min="0.01" step="0.01" value={incomeDraft.amount || ''} onChange={(event) => setIncomeDraft((current) => ({ ...current, amount: event.target.value === '' ? 0 : Number(event.target.value) }))} placeholder="0.00" />
							</div>
						</div>
						<button className="tool-button secondary" type="button" onClick={() => addItem('incomeItems', incomeDraft, setIncomeDraft)}>Add income line</button>
					</section>

					<section className="statement-entry-section" aria-label="Add expense">
						<h2>Add expense</h2>
						<div className="statement-entry-fields">
							<div className="calc-field">
								<label htmlFor="statement-expense-category">Category</label>
								<select id="statement-expense-category" value={expenseDraft.category} onChange={(event) => {
									if (isOneOf(event.target.value, PROFIT_LOSS_EXPENSE_CATEGORIES)) setExpenseDraft((current) => ({ ...current, category: event.target.value }));
								}}>
									{PROFIT_LOSS_EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
								</select>
							</div>
							<div className="calc-field">
								<label htmlFor="statement-expense-description">Description</label>
								<input id="statement-expense-description" maxLength={200} value={expenseDraft.description} onChange={(event) => setExpenseDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What was spent?" />
							</div>
							<div className="calc-field">
								<label htmlFor="statement-expense-amount">Amount ({statement.currency})</label>
								<input id="statement-expense-amount" type="number" min="0.01" step="0.01" value={expenseDraft.amount || ''} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value === '' ? 0 : Number(event.target.value) }))} placeholder="0.00" />
							</div>
						</div>
						<button className="tool-button secondary" type="button" onClick={() => addItem('expenseItems', expenseDraft, setExpenseDraft)}>Add expense line</button>
					</section>

					<div className="calc-field statement-notes-field">
						<label htmlFor="statement-notes">Notes (optional)</label>
						<textarea id="statement-notes" maxLength={500} rows={3} value={statement.notes} onChange={(event) => updateStatement('notes', event.target.value)} placeholder="Additional context for this statement" />
					</div>
					<div className="tool-actions">
						<button className="tool-button" type="button" disabled={busy || !totals || !statement.businessName.trim()} onClick={downloadPdf}>
							{busy ? 'Preparing PDF…' : 'Download statement PDF'}
						</button>
					</div>
					<p className={`tool-message${summary.error ? ' error' : ''}`} role="status">
						{message || summary.error || (!totals ? 'Add at least one income or expense line.' : 'Statement totals are ready to review and export.')}
					</p>
				</section>

				<section className="statement-preview" aria-label="Profit and loss statement preview">
					<header className="statement-preview-header">
						<div>
							<p className="invoice-generator-kicker">FINANCIAL SUMMARY</p>
							<h2>{statement.businessName.trim() || 'Your Business'}</h2>
							<p>{formatPeriod(statement.periodStart)} to {formatPeriod(statement.periodEnd)}</p>
						</div>
						<span>PROFIT &amp; LOSS</span>
					</header>
					<div className="statement-preview-section">
						<h3>Income</h3>
						{statement.incomeItems.length ? statement.incomeItems.map((item) => (
							<p key={item.id}><span>{item.category} · {item.description}</span><strong>{formatProfitLossStatementAmount(item.amount, statement.currency)}</strong></p>
						)) : <p className="statement-empty">No income lines added.</p>}
						<p className="statement-subtotal"><span>Total income</span><strong>{formatProfitLossStatementAmount(totals?.totalIncome ?? 0, statement.currency)}</strong></p>
					</div>
					<div className="statement-preview-section">
						<h3>Expenses</h3>
						{statement.expenseItems.length ? statement.expenseItems.map((item) => (
							<p key={item.id}><span>{item.category} · {item.description}</span><strong>{formatProfitLossStatementAmount(item.amount, statement.currency)}</strong></p>
						)) : <p className="statement-empty">No expense lines added.</p>}
						<p className="statement-subtotal"><span>Total expenses</span><strong>{formatProfitLossStatementAmount(totals?.totalExpenses ?? 0, statement.currency)}</strong></p>
					</div>
					<div className="statement-net-result">
						<span>{resultLabel}</span>
						<strong>{totals ? formatProfitLossStatementAmount(Math.abs(totals.netProfit), statement.currency) : '—'}</strong>
					</div>
					{totals?.margin !== null && totals?.margin !== undefined && <p className="statement-margin">Net margin: {totals.margin.toFixed(2)}%</p>}
					{statement.notes.trim() && <div className="statement-preview-notes"><strong>Notes</strong><p>{statement.notes}</p></div>}
					<p className="statement-disclaimer">A simple summary based on the details entered. Not tax, audit, or accounting advice.</p>
				</section>
			</div>

			<div className="statement-line-tables">
				{[
					{ title: 'Income lines', items: statement.incomeItems, section: 'incomeItems' as const },
					{ title: 'Expense lines', items: statement.expenseItems, section: 'expenseItems' as const },
				].map(({ title, items, section }) => (
					<section className="statement-line-table-section" key={section}>
						<h2>{title} <span>({items.length})</span></h2>
						{items.length ? (
							<div className="expense-table-wrap">
								<table className="expense-table">
									<thead><tr><th>Category</th><th>Description</th><th>Amount</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
									<tbody>{section === 'incomeItems'
										? renderLines(statement.incomeItems, section)
										: renderLines(statement.expenseItems, section)}
									</tbody>
								</table>
							</div>
						) : <p className="expense-empty-state">No {section === 'incomeItems' ? 'income' : 'expense'} lines added.</p>}
					</section>
				))}
			</div>
			<p className="expense-privacy-note">This statement is created in your browser and is not saved or uploaded. Amounts must all use the selected currency; this tool does not convert currencies, import tracker records, or calculate tax.</p>
		</div>
	);
}
