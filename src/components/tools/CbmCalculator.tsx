import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { cbmConfig } from './shippingEcommerceConfigs';

export default function CbmCalculator() {
	return <ShippingEcommerceCalculator config={cbmConfig} />;
}
