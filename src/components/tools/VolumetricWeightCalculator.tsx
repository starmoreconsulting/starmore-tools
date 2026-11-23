import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { volumetricWeightConfig } from './shippingEcommerceConfigs';

export default function VolumetricWeightCalculator() {
	return <ShippingEcommerceCalculator config={volumetricWeightConfig} />;
}
