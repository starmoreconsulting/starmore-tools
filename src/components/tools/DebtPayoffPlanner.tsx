import { useMemo, useState } from 'react';
import {
	calculateDebtPayoffPlans,
	DEBT_PAYOFF_MAX_DEBTS,
	DEBT_PAYOFF_MAX_MONTHS,
	type DebtPayoffDebt,
	type DebtPayoffPlan,
} from '../../engines/debt-payoff-planner';

let nextDebtId = 0;

function initialDraft() {
	return { name: '', balance: '', apr: '', minimumPayment: '' };
}

function formatAmount(amount: number): string {
	return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function planStatus(plan: DebtPayoffPlan): string {
	if (plan.status === 'paid-off') return `Estimated payoff in ${plan.months} ${plan.months === 1 ? 'month' : 'months'}.`;
	if (plan.status === 'unstable') return 'Projection stopped because the balance exceeded safe calculation limits.';
	return `Not projected to be fully paid off within ${DEBT_PAYOFF_MAX_MONTHS} months.`;
}

function StrategyResults({ plan }: { plan: DebtPayoffPlan }) {
	const heading = plan.strategy === 'snowball' ? 'Snowball' : 'Avalanche';
	return (
		<section className="debt-payoff-plan" aria-label={`${heading} payoff estimate`}>
			<h3>{heading}</h3>
			<p>{planStatus(plan)}</p>
			<div className="calc-result-grid">
				<div className="calc-result">
					<span className="calc-label">PAYOFF TIME</span>
					<strong>{plan.months === null ? '—' : `${plan.months} ${plan.months === 1 ? 'month' : 'months'}`}</strong>
				</div>
				<div className="calc-result">
					<span className="calc-label">TOTAL INTEREST</span>
					<strong>{plan.totalInterest === null ? 'Not available' : formatAmount(plan.totalInterest)}</strong>
				</div>
			</div>
			<h4>Payoff schedule</h4>
			{plan.payoffSchedule.length ? (
				<ol>
					{plan.payoffSchedule.map((entry) => (
						<li key={entry.id}>{entry.name} — estimated month {entry.paidOffMonth}</li>
					))}
				</ol>
			) : <p>No debts are projected to be paid off within the simulation horizon.</p>}
			{plan.unresolvedDebts.length > 0 && (
				<div className="tool-message error" role="status">
					<strong>Still outstanding at the simulation limit:</strong>
					<ul>
						{plan.unresolvedDebts.map((debt) => (
							<li key={debt.id}>{debt.name}: remaining balance {formatAmount(debt.balance)}</li>
						))}
					</ul>
				</div>
			)}
		</section>
	);
}

export default function DebtPayoffPlanner() {
	const [debts, setDebts] = useState<DebtPayoffDebt[]>([]);
	const [draft, setDraft] = useState(initialDraft);
	const [extraMonthlyPayment, setExtraMonthlyPayment] = useState('0');
	const [message, setMessage] = useState('');
	const [isError, setIsError] = useState(false);

	const calculation = useMemo(() => {
		if (!debts.length) return { results: null, error: '' };
		try {
			return {
				results: calculateDebtPayoffPlans({
					debts,
					extraMonthlyPayment: extraMonthlyPayment.trim() === '' ? 0 : Number(extraMonthlyPayment),
				}),
				error: '',
			};
		} catch (error) {
			return {
				results: null,
				error: error instanceof Error ? error.message : 'Could not estimate debt payoff.',
			};
		}
	}, [debts, extraMonthlyPayment]);

	const addDebt = () => {
		const debt: DebtPayoffDebt = {
			id: `debt-${++nextDebtId}`,
			name: draft.name.trim(),
			balance: draft.balance.trim() === '' ? Number.NaN : Number(draft.balance),
			apr: draft.apr.trim() === '' ? Number.NaN : Number(draft.apr),
			minimumPayment: draft.minimumPayment.trim() === '' ? Number.NaN : Number(draft.minimumPayment),
		};
		try {
			calculateDebtPayoffPlans({ debts: [...debts, debt], extraMonthlyPayment: Number(extraMonthlyPayment) || 0 });
			setDebts((current) => [...current, debt]);
			setDraft(initialDraft());
			setMessage(`${debt.name} added.`);
			setIsError(false);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Check the debt details and try again.');
			setIsError(true);
		}
	};

	const removeDebt = (id: string) => {
		setDebts((current) => current.filter((debt) => debt.id !== id));
		setMessage('Debt removed.');
		setIsError(false);
	};

	const effectiveMessage = message || calculation.error
		|| (debts.length ? 'Estimates update automatically as your inputs change.' : 'Add debts to compare payoff strategies.');

	return (
		<div className="debt-payoff-planner">
			<section aria-label="Add a debt">
				<h2>Add a debt</h2>
				<div className="calc-fields calc-fields-three">
					<div className="calc-field">
						<label htmlFor="debt-payoff-name">Debt name</label>
						<input id="debt-payoff-name" maxLength={100} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Credit card" />
					</div>
					<div className="calc-field">
						<label htmlFor="debt-payoff-balance">Current balance</label>
						<input id="debt-payoff-balance" type="number" min="0" step="any" inputMode="decimal" value={draft.balance} onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))} placeholder="5000" />
					</div>
					<div className="calc-field">
						<label htmlFor="debt-payoff-apr">APR (%)</label>
						<input id="debt-payoff-apr" type="number" min="0" step="any" inputMode="decimal" value={draft.apr} onChange={(event) => setDraft((current) => ({ ...current, apr: event.target.value }))} placeholder="18.9" />
					</div>
					<div className="calc-field">
						<label htmlFor="debt-payoff-minimum">Minimum monthly payment</label>
						<input id="debt-payoff-minimum" type="number" min="0" step="any" inputMode="decimal" value={draft.minimumPayment} onChange={(event) => setDraft((current) => ({ ...current, minimumPayment: event.target.value }))} placeholder="150" />
					</div>
				</div>
				<div className="tool-actions">
					<button className="tool-button" type="button" onClick={addDebt} disabled={debts.length >= DEBT_PAYOFF_MAX_DEBTS}>Add debt</button>
				</div>
			</section>

			<section aria-label="Debt payoff inputs">
				<h2>Your debts</h2>
				{debts.length ? (
					<ul className="debt-payoff-debt-list">
						{debts.map((debt) => (
							<li key={debt.id}>
								<strong>{debt.name}</strong>
								<span>Balance {formatAmount(debt.balance)} · APR {debt.apr}% · Minimum {formatAmount(debt.minimumPayment)}/month</span>
								<button className="tool-button secondary" type="button" aria-label={`Remove ${debt.name}`} onClick={() => removeDebt(debt.id)}>Remove</button>
							</li>
						))}
					</ul>
				) : <p>No debts added yet.</p>}
				<div className="calc-field">
					<label htmlFor="debt-payoff-extra">Extra monthly payment (optional)</label>
					<input id="debt-payoff-extra" type="number" min="0" step="any" inputMode="decimal" value={extraMonthlyPayment} onChange={(event) => setExtraMonthlyPayment(event.target.value)} />
				</div>
			</section>

			<p className={`tool-message${isError || calculation.error ? ' error' : ''}`} role={isError || calculation.error ? 'alert' : 'status'}>
				{effectiveMessage}
			</p>

			{calculation.results && (
				<>
					{calculation.results.minimumPaymentWarnings.length > 0 && (
						<div className="tool-message error" role="alert">
							<strong>Minimum-payment warning:</strong> these payments do not reduce principal in the first month. At the listed minimums alone, balances may grow or remain unchanged; additional payments may be needed to make progress.
							<ul>
								{calculation.results.minimumPaymentWarnings.map((debt) => (
									<li key={debt.id}>{debt.name}: minimum {formatAmount(debt.minimumPayment)}, initial monthly interest {formatAmount(debt.monthlyInterest)}</li>
								))}
							</ul>
						</div>
					)}
					<p className="tool-message">
						Estimates assume fixed APRs and minimum payments, monthly compounding, and that each month’s minimums plus extra are available for payment. Actual lender calculations, fees, payment timing, and changing rates can differ.
					</p>
					<div className="debt-payoff-plans">
						<StrategyResults plan={calculation.results.plans.snowball} />
						<StrategyResults plan={calculation.results.plans.avalanche} />
					</div>
				</>
			)}
		</div>
	);
}
