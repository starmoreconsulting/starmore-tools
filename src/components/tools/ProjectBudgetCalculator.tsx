import { useMemo, useState } from 'react';
import {
	calculateProjectBudget,
	createProjectBudgetCsv,
	formatProjectBudgetAmount,
	PROJECT_BUDGET_CATEGORIES,
	PROJECT_BUDGET_CURRENCIES,
	PROJECT_BUDGET_MAX_DESCRIPTION_LENGTH,
	PROJECT_BUDGET_MAX_ITEMS,
	type ProjectBudgetCategory,
	type ProjectBudgetInput,
	type ProjectBudgetItem,
} from '../../engines/project-budget';
import { isOneOf } from '../../engines/expense-tracker';
import { triggerDownload } from '../../engines/pdf';

function initialBudget(): ProjectBudgetInput {
	return {
		items: [],
		currency: 'NGN',
		contingencyRate: 10,
		budgetLimit: null,
	};
}

function initialDraft() {
	return {
		description: '',
		category: 'Other' as ProjectBudgetCategory,
		quantity: 1,
		unitCost: 0,
	};
}

export default function ProjectBudgetCalculator() {
	const [budget, setBudget] = useState(initialBudget);
	const [draft, setDraft] = useState(initialDraft);
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const calculation = useMemo(() => {
		try {
			return { totals: calculateProjectBudget(budget), error: '' };
		} catch (error) {
			return {
				totals: null,
				error: error instanceof Error ? error.message : 'Could not calculate the project budget.',
			};
		}
	}, [budget]);

	const updateBudget = <K extends keyof ProjectBudgetInput>(key: K, value: ProjectBudgetInput[K]) => {
		setBudget((current) => ({ ...current, [key]: value }));
		setMessage('');
		setIsError(false);
	};

	const addItem = () => {
		const item: ProjectBudgetItem = { ...draft, description: draft.description.trim(), id: crypto.randomUUID() };
		try {
			calculateProjectBudget({ ...budget, items: [...budget.items, item] });
			setBudget((current) => ({ ...current, items: [...current.items, item] }));
			setDraft(initialDraft());
			setMessage('Budget item added.');
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not add this budget item.');
			setIsError(true);
		}
	};

	const removeItem = (id: string) => {
		setBudget((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
		setMessage('Budget item removed.');
		setIsError(false);
	};

	const exportCsv = () => {
		try {
			const csv = createProjectBudgetCsv(budget);
			const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
			const date = new Date().toISOString().slice(0, 10);
			triggerDownload(blob, `project-budget-${date}.csv`);
			setMessage('Project budget CSV downloaded.');
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Could not export the project budget.');
			setIsError(true);
		}
	};

	const displayAmount = (value: number) => formatProjectBudgetAmount(value, budget.currency);
	const effectiveMessage = message || calculation.error
		|| (budget.items.length ? 'Budget totals update automatically as you edit.' : 'Add budget items to estimate your project costs.');
	const effectiveError = isError || Boolean(calculation.error);

	return (
		<div>
			<section className="project-budget-settings" aria-label="Project budget settings">
				<div className="calc-fields three-columns">
					<div className="calc-field">
						<label htmlFor="project-budget-currency">Currency</label>
						<select id="project-budget-currency" value={budget.currency} onChange={(event) => {
							if (isOneOf(event.target.value, PROJECT_BUDGET_CURRENCIES)) updateBudget('currency', event.target.value);
						}}>
							{PROJECT_BUDGET_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="project-budget-limit">Total budget limit (optional)</label>
						<input id="project-budget-limit" type="number" min="0" step="0.01" value={budget.budgetLimit ?? ''} onChange={(event) => updateBudget('budgetLimit', event.target.value === '' ? null : Number(event.target.value))} placeholder="No limit" />
					</div>
					<div className="calc-field">
						<label htmlFor="project-budget-contingency">Contingency</label>
						<div className="calc-input-suffix">
							<input id="project-budget-contingency" type="number" min="0" max="100" step="0.1" value={budget.contingencyRate} onChange={(event) => updateBudget('contingencyRate', event.target.value === '' ? Number.NaN : Number(event.target.value))} />
							<span>%</span>
						</div>
					</div>
				</div>
			</section>

			<section className="project-budget-add-section" aria-label="Add project budget item">
				<h2>Add budget item</h2>
				<div className="project-budget-add-fields">
					<div className="calc-field">
						<label htmlFor="project-budget-description">Description</label>
						<input id="project-budget-description" maxLength={PROJECT_BUDGET_MAX_DESCRIPTION_LENGTH} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What does the project need?" />
					</div>
					<div className="calc-field">
						<label htmlFor="project-budget-category">Category</label>
						<select id="project-budget-category" value={draft.category} onChange={(event) => {
							if (isOneOf(event.target.value, PROJECT_BUDGET_CATEGORIES)) setDraft((current) => ({ ...current, category: event.target.value }));
						}}>
							{PROJECT_BUDGET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
						</select>
					</div>
					<div className="calc-field">
						<label htmlFor="project-budget-quantity">Quantity</label>
						<input id="project-budget-quantity" type="number" min="0.001" step="any" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} />
					</div>
					<div className="calc-field">
						<label htmlFor="project-budget-unit-cost">Cost per unit ({budget.currency})</label>
						<input id="project-budget-unit-cost" type="number" min="0" step="0.01" value={Number.isFinite(draft.unitCost) ? draft.unitCost : ''} onChange={(event) => setDraft((current) => ({ ...current, unitCost: event.target.value === '' ? Number.NaN : Number(event.target.value) }))} />
					</div>
				</div>
				<button className="tool-button secondary" type="button" disabled={budget.items.length >= PROJECT_BUDGET_MAX_ITEMS} onClick={addItem}>Add to budget</button>
				<p className="inline-note">{budget.items.length} of {PROJECT_BUDGET_MAX_ITEMS} items</p>
			</section>

			<section className="project-budget-results" aria-label="Project budget summary">
				<div className="project-budget-results-header">
					<div><h2>Budget estimate</h2><p>All amounts use the selected currency.</p></div>
					<button className="tool-button secondary" type="button" disabled={!budget.items.length || Boolean(calculation.error)} onClick={exportCsv}>Export CSV</button>
				</div>
				{calculation.totals && (
					<>
						<div className="project-budget-total-cards" aria-live="polite">
							<div className="calc-result"><span className="calc-label">ITEM SUBTOTAL</span><strong>{displayAmount(calculation.totals.subtotal)}</strong></div>
							<div className="calc-result"><span className="calc-label">CONTINGENCY ({Number.isFinite(budget.contingencyRate) ? budget.contingencyRate : '—'}%)</span><strong>{displayAmount(calculation.totals.contingency)}</strong></div>
							<div className="calc-result featured"><span className="calc-label">ESTIMATED TOTAL</span><strong>{displayAmount(calculation.totals.total)}</strong></div>
						</div>
						{budget.budgetLimit !== null && (
							<div className={`project-budget-status${calculation.totals.overBudget ? ' over' : ''}`}>
								<div>
									<span>{calculation.totals.overBudget ? 'OVER BUDGET' : 'REMAINING BUDGET'}</span>
									<strong>{displayAmount(calculation.totals.overBudget || (calculation.totals.remaining ?? 0))}</strong>
								</div>
								<p>Limit: {displayAmount(budget.budgetLimit)} · Estimate including contingency: {displayAmount(calculation.totals.total)}</p>
							</div>
						)}
						{calculation.totals.categoryTotals.size > 0 && (
							<div className="project-budget-category-summary">
								<h3>Costs by category</h3>
								{[...calculation.totals.categoryTotals.entries()].map(([category, total]) => (
									<p key={category}><span>{category}</span><strong>{displayAmount(total)}</strong></p>
								))}
								<small>Category amounts are item subtotals before contingency.</small>
							</div>
						)}
					</>
				)}
			</section>

			<section className="project-budget-items" aria-label="Project budget items">
				<div className="project-budget-items-heading"><h2>Budget items</h2><span>{budget.items.length}</span></div>
				{budget.items.length ? (
					<div className="expense-table-wrap">
						<table className="expense-table project-budget-table">
							<thead><tr><th>Description</th><th>Category</th><th>Quantity</th><th>Unit cost</th><th>Line total</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
							<tbody>{budget.items.map((item, index) => {
								const lineTotal = Math.round(item.quantity * item.unitCost * 100) / 100;
								return (
									<tr key={item.id}>
										<td>{item.description}</td>
										<td>
											<select aria-label={`Category for ${item.description}`} value={item.category} onChange={(event) => {
												if (isOneOf(event.target.value, PROJECT_BUDGET_CATEGORIES)) {
													setBudget((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, category: event.target.value } : entry) }));
												}
											}}>
												{PROJECT_BUDGET_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
											</select>
										</td>
										<td><input aria-label={`Quantity for ${item.description}`} type="number" min="0.001" step="any" value={Number.isFinite(item.quantity) ? item.quantity : ''} onChange={(event) => {
											const quantity = event.target.value === '' ? Number.NaN : Number(event.target.value);
											setBudget((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, quantity } : entry) }));
										}} /></td>
										<td><input aria-label={`Unit cost for ${item.description}`} type="number" min="0" step="0.01" value={Number.isFinite(item.unitCost) ? item.unitCost : ''} onChange={(event) => {
											const unitCost = event.target.value === '' ? Number.NaN : Number(event.target.value);
											setBudget((current) => ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, unitCost } : entry) }));
										}} /></td>
										<td>{Number.isFinite(lineTotal) ? displayAmount(lineTotal) : '—'}</td>
										<td><button className="expense-delete-button" type="button" aria-label={`Delete budget item ${index + 1}`} onClick={() => removeItem(item.id)}>Delete</button></td>
									</tr>
								);
							})}</tbody>
						</table>
					</div>
				) : <p className="expense-empty-state">No budget items yet. Add the first item above.</p>}
			</section>
			<p className={`tool-message${effectiveError ? ' error' : ''}`} role="status">{message || calculation.error || effectiveMessage}</p>
			<p className="expense-privacy-note">This calculator works in your browser and does not save or upload your project details. Estimates are planning aids; actual costs may differ. The tool does not convert currencies or apply tax.</p>
		</div>
	);
}
