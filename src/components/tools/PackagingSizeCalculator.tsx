import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { packagingSizeConfig } from './shippingEcommerceConfigs';

export default function PackagingSizeCalculator() {
	return <ShippingEcommerceCalculator config={packagingSizeConfig} />;
}
