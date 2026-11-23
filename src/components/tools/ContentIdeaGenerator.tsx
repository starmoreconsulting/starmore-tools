import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function ContentIdeaGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.idea} />;
}
