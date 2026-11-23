import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { chargeableWeightConfig } from './shippingEcommerceConfigs';

export default function ChargeableWeightCalculator() {
	return <ShippingEcommerceCalculator config={chargeableWeightConfig} />;
}
