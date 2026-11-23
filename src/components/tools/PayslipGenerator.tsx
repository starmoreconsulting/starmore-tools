import { useMemo, useState } from 'react';
import {
	calculatePayslipTotals,
	formatPayslipMoney,
	PAYSLIP_MAX_FIELD_LENGTH,
	PAYSLIP_MAX_ITEMS,
	PAYSLIP_MAX_NAME_LENGTH,
	sanitizePayslipText,
	type PayslipGeneratorInput,
	type PayslipLineItem,
	validatePayslipInput,
} from '../../engines/payslip-generator';
import './PayslipGenerator.css';

function localDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function initialPayslip(): PayslipGeneratorInput {
	const today = localDateString(new Date());
	return {
		employerName: '',
		employerDetails: '',
		employeeName: '',
		employeeId: '',
		jobTitle: '',
		payPeriodStart: today,
		payPeriodEnd: today,
		payDate: today,
		currency: 'NGN',
		earnings: [{ description: 'Regular earnings', amount: 0 }],
		deductions: [],
		notes: '',
	};
}

export default function PayslipGenerator() {
	const [payslip, setPayslip] = useState(initialPayslip);
	const [message, setMessage] = useState('Your entries stay in this page; no payslip data is sent to a Starmore Tools service.');
	const totals = useMemo(() => {
		try {
			return { value: calculatePayslipTotals(payslip.earnings, payslip.deductions), error: '' };
		} catch (error) {
			return { value: null, error: error instanceof Error ? error.message : 'Could not calculate payslip totals.' };
		}
	}, [payslip.earnings, payslip.deductions]);
	const validationError = useMemo(() => {
		try {
			validatePayslipInput(payslip);
			return '';
		} catch (error) {
			return error instanceof Error ? error.message : 'Check the payslip details and amounts.';
		}
	}, [payslip]);

	const updateField = <K extends keyof PayslipGeneratorInput>(key: K, value: PayslipGeneratorInput[K]) => {
		setPayslip((current) => ({ ...current, [key]: value }));
		setMessage('');
	};

	const updateItem = (
		group: 'earnings' | 'deductions',
		index: number,
		key: keyof PayslipLineItem,
		value: string,
	) => {
		setPayslip((current) => ({
			...current,
			[group]: current[group].map((item, itemIndex) => itemIndex === index
				? { ...item, [key]: key === 'description' ? value : value === '' ? Number.NaN : Number(value) }
				: item),
		}));
		setMessage('');
	};

	const displayMoney = (value: number) => {
		try {
			return formatPayslipMoney(value, payslip.currency);
		} catch {
			return `${payslip.currency} ${value.toFixed(2)}`;
		}
	};
	const displayLineAmount = (value: number) => {
		const cents = Math.round(value * 100);
		return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(cents)
			? displayMoney(cents / 100)
			: '—';
	};

	const printPayslip = () => {
		try {
			validatePayslipInput(payslip);
			setMessage('Opening your browser print dialog.');
			window.print();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Check the payslip details before printing.');
		}
	};

	const renderLineItems = (group: 'earnings' | 'deductions', title: string) => {
		const items = payslip[group];
		return (
			<div className="payslip-lines">
				<strong>{title}</strong>
				<div className="payslip-line-head" aria-hidden="true"><span>Description</span><span>Amount</span><span /></div>
				{items.map((item, index) => (
					<div className="payslip-line" key={`${group}-${index}`}>
						<input
							aria-label={`${title} ${index + 1} description`}
							maxLength={PAYSLIP_MAX_FIELD_LENGTH}
							value={item.description}
							onChange={(event) => updateItem(group, index, 'description', event.target.value)}
						/>
						<input
							aria-label={`${title} ${index + 1} amount`}
							type="number"
							min="0"
							step="0.01"
							value={Number.isFinite(item.amount) ? item.amount : ''}
							onChange={(event) => updateItem(group, index, 'amount', event.target.value)}
						/>
						<button
							className="tool-button secondary"
							type="button"
							aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
							disabled={items.length === 0 || (group === 'earnings' && items.length === 1)}
							onClick={() => updateField(group, items.filter((_, itemIndex) => itemIndex !== index))}
						>×</button>
					</div>
				))}
				<button
					className="tool-button secondary"
					type="button"
					disabled={items.length >= PAYSLIP_MAX_ITEMS}
					onClick={() => updateField(group, [...items, { description: '', amount: 0 }])}
				>Add {title.toLowerCase()} line</button>
				{items.length >= PAYSLIP_MAX_ITEMS && <small>Maximum of {PAYSLIP_MAX_ITEMS} lines.</small>}
			</div>
		);
	};

	const printable = (value: string) => sanitizePayslipText(value);

	return (
		<div className="payslip-generator">
			<div className="payslip-columns">
				<div className="payslip-form">
					<div className="payslip-fields">
						<div className="payslip-field">
							<label htmlFor="payslip-employer">Employer name</label>
							<input id="payslip-employer" maxLength={PAYSLIP_MAX_NAME_LENGTH} value={payslip.employerName} onChange={(event) => updateField('employerName', event.target.value)} />
						</div>
						<div className="payslip-field">
							<label htmlFor="payslip-employer-details">Employer address and details (optional)</label>
							<textarea id="payslip-employer-details" maxLength={PAYSLIP_MAX_FIELD_LENGTH} rows={2} value={payslip.employerDetails} onChange={(event) => updateField('employerDetails', event.target.value)} />
						</div>
						<div className="payslip-field">
							<label htmlFor="payslip-worker">Worker name</label>
							<input id="payslip-worker" maxLength={PAYSLIP_MAX_NAME_LENGTH} value={payslip.employeeName} onChange={(event) => updateField('employeeName', event.target.value)} />
						</div>
						<div className="payslip-two-fields">
							<div className="payslip-field">
								<label htmlFor="payslip-worker-id">Worker ID (optional)</label>
								<input id="payslip-worker-id" maxLength={PAYSLIP_MAX_FIELD_LENGTH} value={payslip.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} />
							</div>
							<div className="payslip-field">
								<label htmlFor="payslip-job-title">Job title (optional)</label>
								<input id="payslip-job-title" maxLength={PAYSLIP_MAX_FIELD_LENGTH} value={payslip.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} />
							</div>
						</div>
						<div className="payslip-two-fields">
							<div className="payslip-field">
								<label htmlFor="payslip-period-start">Pay period start</label>
								<input id="payslip-period-start" type="date" value={payslip.payPeriodStart} onChange={(event) => updateField('payPeriodStart', event.target.value)} />
							</div>
							<div className="payslip-field">
								<label htmlFor="payslip-period-end">Pay period end</label>
								<input id="payslip-period-end" type="date" value={payslip.payPeriodEnd} onChange={(event) => updateField('payPeriodEnd', event.target.value)} />
							</div>
						</div>
						<div className="payslip-two-fields">
							<div className="payslip-field">
								<label htmlFor="payslip-pay-date">Pay date</label>
								<input id="payslip-pay-date" type="date" value={payslip.payDate} onChange={(event) => updateField('payDate', event.target.value)} />
							</div>
							<div className="payslip-field">
								<label htmlFor="payslip-currency">Currency</label>
								<select id="payslip-currency" value={payslip.currency} onChange={(event) => updateField('currency', event.target.value)}>
									<option value="NGN">NGN — Nigerian naira</option><option value="USD">USD — US dollar</option>
									<option value="EUR">EUR — Euro</option><option value="GBP">GBP — British pound</option>
									<option value="CAD">CAD — Canadian dollar</option><option value="AUD">AUD — Australian dollar</option>
									<option value="GHS">GHS — Ghanaian cedi</option><option value="KES">KES — Kenyan shilling</option>
									<option value="ZAR">ZAR — South African rand</option><option value="INR">INR — Indian rupee</option>
								</select>
							</div>
						</div>
					</div>

					{renderLineItems('earnings', 'Earnings')}
					{renderLineItems('deductions', 'Deductions')}
					<div className="payslip-field">
						<label htmlFor="payslip-notes">Notes (optional)</label>
						<textarea id="payslip-notes" maxLength={PAYSLIP_MAX_FIELD_LENGTH} rows={3} value={payslip.notes} onChange={(event) => updateField('notes', event.target.value)} />
					</div>
				</div>

				<section className="payslip-preview" aria-label="Live payslip preview">
					<header className="payslip-header">
						<div>
							<p className="payslip-kicker">EMPLOYER</p>
							<h2>{printable(payslip.employerName) || 'Employer name'}</h2>
							<p className="payslip-prewrap">{printable(payslip.employerDetails) || 'Employer address and details'}</p>
						</div>
						<div className="payslip-title"><h2>PAYSLIP</h2><p>{printable(payslip.payDate) || 'Pay date'}</p></div>
					</header>
					<div className="payslip-parties">
						<div><p className="payslip-kicker">WORKER</p><strong>{printable(payslip.employeeName) || 'Worker name'}</strong>
							{payslip.employeeId && <p>Worker ID: {printable(payslip.employeeId)}</p>}
							{payslip.jobTitle && <p>{printable(payslip.jobTitle)}</p>}
						</div>
						<div>
							<p><strong>Pay period</strong> {printable(payslip.payPeriodStart) || '—'} to {printable(payslip.payPeriodEnd) || '—'}</p>
						</div>
					</div>
					<div className="payslip-table-wrap">
						<table className="payslip-table">
							<thead><tr><th>Earnings</th><th>Amount</th></tr></thead>
							<tbody>{payslip.earnings.map((item, index) => (
								<tr key={`earning-${index}`}><td>{printable(item.description) || '—'}</td><td>{displayLineAmount(item.amount)}</td></tr>
							))}</tbody>
						</table>
						<table className="payslip-table">
							<thead><tr><th>Deductions</th><th>Amount</th></tr></thead>
							<tbody>{payslip.deductions.length
								? payslip.deductions.map((item, index) => (
									<tr key={`deduction-${index}`}><td>{printable(item.description) || '—'}</td><td>{displayLineAmount(item.amount)}</td></tr>
								))
								: <tr><td>No deductions entered</td><td>{displayMoney(0)}</td></tr>}
							</tbody>
						</table>
					</div>
					<div className="payslip-summary">
						<p><span>Gross pay</span><strong>{totals.value ? displayMoney(totals.value.grossPay) : '—'}</strong></p>
						<p><span>Total deductions</span><strong>{totals.value ? displayMoney(totals.value.totalDeductions) : '—'}</strong></p>
						<p className="payslip-net"><span>Net pay</span><strong>{totals.value ? displayMoney(totals.value.netPay) : '—'}</strong></p>
					</div>
					{payslip.notes && <div className="payslip-notes"><p className="payslip-kicker">NOTES</p><p className="payslip-prewrap">{printable(payslip.notes)}</p></div>}
					{(totals.error || validationError) && <p className="payslip-error" role="status">{totals.error || validationError}</p>}
					<p className="payslip-legal">Amounts shown are entered by the user. This tool does not calculate tax or statutory deductions and does not determine legal or payroll compliance.</p>
				</section>
			</div>
			<div className="payslip-actions">
				<button className="tool-button" type="button" disabled={Boolean(validationError)} onClick={printPayslip}>Print payslip</button>
			</div>
			<p className="payslip-message" role="status">{message}</p>
			<p className="payslip-privacy">Your entries remain in this page and are not sent to a Starmore Tools service. Avoid shared devices, and remember your browser or printer may retain printed output.</p>
		</div>
	);
}
