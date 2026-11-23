import ShippingEcommerceCalculator from './ShippingEcommerceCalculator';
import { bulkOrderConfig } from './shippingEcommerceConfigs';

export default function BulkOrderCalculator() {
	return <ShippingEcommerceCalculator config={bulkOrderConfig} />;
}
