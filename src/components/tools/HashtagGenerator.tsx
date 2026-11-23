import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function HashtagGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.hashtag} />;
}
