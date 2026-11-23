import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function YoutubeDescriptionGenerator() {
	return <SocialTextGenerator config={socialContentConfigs['youtube-description']} />;
}
