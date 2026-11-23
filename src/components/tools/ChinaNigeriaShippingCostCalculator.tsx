import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { chinaNigeriaShippingConfig } from './shippingEcommerceConfigs';

export default function ChinaNigeriaShippingCostCalculator() {
	return <ShippingEcommerceCalculator config={chinaNigeriaShippingConfig} />;
}
