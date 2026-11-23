import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function BlogTitleGenerator() {
	return <SocialTextGenerator config={socialContentConfigs['blog-title']} />;
}
