import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function CallToActionGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.cta} />;
}
