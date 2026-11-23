import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { importCostConfig } from './shippingEcommerceConfigs';

export default function ImportCostCalculator() {
	return <ShippingEcommerceCalculator config={importCostConfig} />;
}
