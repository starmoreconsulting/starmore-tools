import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function BioGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.bio} />;
}
