import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { shippingCostConfig } from './shippingEcommerceConfigs';

export default function ShippingCostCalculator() {
	return <ShippingEcommerceCalculator config={shippingCostConfig} />;
}
