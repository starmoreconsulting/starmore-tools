import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { landedCostConfig } from './shippingEcommerceConfigs';

export default function LandedCostCalculator() {
	return <ShippingEcommerceCalculator config={landedCostConfig} />;
}
