import SocialTextGenerator from './SocialTextGenerator';
import { socialContentConfigs } from './socialContentConfigs';

export default function VideoScriptGenerator() {
	return <SocialTextGenerator config={socialContentConfigs.script} />;
}
