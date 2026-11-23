import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function BlogOutlineGenerator() {
	return <SocialTextGenerator config={socialContentConfigs['blog-outline']} />;
}
