import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function YoutubeTitleGenerator() {
	return <SocialTextGenerator config={socialContentConfigs['youtube-title']} />;
}
