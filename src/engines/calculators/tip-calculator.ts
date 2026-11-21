export interface TipBreakdown {
	tipAmount: number;
	totalAmount: number;
	tipPerPerson: number;
	totalPerPerson: number;
}

export function calculateTip(billAmount: number, tipPercent: number, people: number): TipBreakdown {
	if (!Number.isFinite(billAmount) || billAmount < 0) {
		throw new Error('Enter a valid non-negative bill amount.');
	}
	if (!Number.isFinite(tipPercent) || tipPercent < 0) {
		throw new Error('Enter a valid non-negative tip percentage.');
	}
	if (!Number.isSafeInteger(people) || people < 1) {
		throw new Error('Enter a whole number of people greater than zero.');
	}

	const tipAmount = billAmount * (tipPercent / 100);
	const totalAmount = billAmount + tipAmount;
	const tipPerPerson = tipAmount / people;
	const totalPerPerson = totalAmount / people;
	if (![tipAmount, totalAmount, tipPerPerson, totalPerPerson].every(Number.isFinite)) {
		throw new Error('These values are too large to calculate safely.');
	}

	return { tipAmount, totalAmount, tipPerPerson, totalPerPerson };
}
