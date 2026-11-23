import { compareUnitPrices, type UnitPriceComparison } from './unit-price-calculator';

export interface ComparableProduct {
	price: number;
	quantity: number;
	unit: string;
}

export interface ProductAttribute {
	name: string;
	firstValue: string;
	secondValue: string;
}

export interface ProductAttributeComparison extends ProductAttribute {
	result: 'same' | 'different' | 'incomplete';
}

export interface ProductComparison {
	unitPrice: UnitPriceComparison;
	unit: string;
	attributes: ProductAttributeComparison[];
}

export function compareProductAttributes(attributes: ProductAttribute[]): ProductAttributeComparison[] {
	return attributes.flatMap((attribute) => {
		const name = attribute.name.trim();
		const firstValue = attribute.firstValue.trim();
		const secondValue = attribute.secondValue.trim();
		if (!name && !firstValue && !secondValue) return [];
		if (!name) throw new Error('Enter a criterion name for each attribute you compare.');

		return [{
			name,
			firstValue,
			secondValue,
			result: !firstValue || !secondValue
				? 'incomplete' as const
				: firstValue.toLocaleLowerCase() === secondValue.toLocaleLowerCase()
					? 'same' as const
					: 'different' as const,
		}];
	});
}

export function compareProducts(
	firstProduct: ComparableProduct,
	secondProduct: ComparableProduct,
	attributes: ProductAttribute[],
): ProductComparison {
	const firstUnit = firstProduct.unit.trim();
	const secondUnit = secondProduct.unit.trim();
	if (!firstUnit || !secondUnit) {
		throw new Error('Enter a unit for both products.');
	}
	if (firstUnit.toLocaleLowerCase() !== secondUnit.toLocaleLowerCase()) {
		throw new Error('Use the same unit for both products so quantities are comparable.');
	}

	const unitPrice = compareUnitPrices(
		firstProduct.price,
		firstProduct.quantity,
		secondProduct.price,
		secondProduct.quantity,
	);

	return {
		unitPrice,
		unit: firstUnit,
		attributes: compareProductAttributes(attributes),
	};
}
