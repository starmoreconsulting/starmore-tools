import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { ecommerceProfitConfig } from './shippingEcommerceConfigs';

export default function EcommerceProfitCalculator() {
	return <ShippingEcommerceCalculator config={ecommerceProfitConfig} />;
}
