import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function AdvertisementCopyGenerator() {
	return <SocialTextGenerator config={socialContentConfigs['ad-copy']} />;
}
