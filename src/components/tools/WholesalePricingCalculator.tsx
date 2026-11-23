import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { wholesalePricingConfig } from './shippingEcommerceConfigs';

export default function WholesalePricingCalculator() {
	return <ShippingEcommerceCalculator config={wholesalePricingConfig} />;
}
