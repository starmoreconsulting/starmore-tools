import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { actualWeightConfig } from './shippingEcommerceConfigs';

export default function ActualWeightCalculator() {
	return <ShippingEcommerceCalculator config={actualWeightConfig} />;
}
