import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { productPricingConfig } from './shippingEcommerceConfigs';

export default function ProductPricingCalculator() {
	return <ShippingEcommerceCalculator config={productPricingConfig} />;
}
