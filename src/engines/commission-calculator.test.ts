import { describe, expect, it } from 'vitest';
import { calculateCommission, formatCommissionAmount, type CommissionCalculatorInput } from './commission-calculator';

const commission: CommissionCalculatorInput = {
	salesAmount: 12500,
	commissionRate: 7.5,
	basePay: 1500,
	currency: 'USD',
};

describe('commission calculator', () => {
	it('calculates flat-rate commission and total earnings with base pay', () => {
		expect(calculateCommission(commission)).toEqual({
			salesAmount: 12500,
			commissionRate: 7.5,
			commission: 937.5,
			basePay: 1500,
			totalEarnings: 2437.5,
		});
	});

	it('supports zero sales, zero commission, or no base pay', () => {
		expect(calculateCommission({ ...commission, salesAmount: 0 }).commission).toBe(0);
		expect(calculateCommission({ ...commission, commissionRate: 0 }).totalEarnings).toBe(1500);
		expect(calculateCommission({ ...commission, basePay: 0 }).totalEarnings).toBe(937.5);
	});

	it('rounds commission to the nearest cent', () => {
		expect(calculateCommission({ ...commission, salesAmount: 10, commissionRate: 2.5 }).commission).toBe(0.25);
	});

	it('rejects invalid sales, rate, base pay, currency, and unsafe totals', () => {
		expect(() => calculateCommission({ ...commission, salesAmount: -1 })).toThrow('non-negative sales amount');
		expect(() => calculateCommission({ ...commission, salesAmount: Number.MAX_VALUE })).toThrow('supported amount');
		expect(() => calculateCommission({ ...commission, commissionRate: 100.1 })).toThrow('between 0 and 100%');
		expect(() => calculateCommission({ ...commission, basePay: -1 })).toThrow('non-negative base pay');
		expect(() => calculateCommission({ ...commission, currency: 'XXX' as CommissionCalculatorInput['currency'] })).toThrow('supported currency');
		expect(() => calculateCommission({ ...commission, salesAmount: 90_071_992_547_409.91, commissionRate: 100, basePay: 1 })).toThrow('too large');
	});

	it('formats monetary amounts with an explicit currency', () => {
		expect(formatCommissionAmount(1234.5, 'NGN')).toBe('NGN 1,234.50');
		expect(() => formatCommissionAmount(Number.NaN, 'USD')).toThrow('valid commission amount');
	});
});
