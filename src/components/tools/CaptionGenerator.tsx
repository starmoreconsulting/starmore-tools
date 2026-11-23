import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function CaptionGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.caption} />;
}
