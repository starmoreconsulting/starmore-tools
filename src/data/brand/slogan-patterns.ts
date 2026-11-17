export type SloganSlot = 'business' | 'action' | 'audience' | 'benefit' | 'toneWord';
export type SloganSlotForm = 'nonempty' | 'nounPhrase' | 'pluralGroup' | 'thirdPersonVerb' | 'infinitiveVerb' | 'adjective';

export interface SloganPattern {
	template: string;
	accepts: Partial<Record<SloganSlot, SloganSlotForm>>;
}

export const sloganPatterns: SloganPattern[] = [
	{ template: '{action} for {audience}', accepts: { action: 'nounPhrase', audience: 'pluralGroup' } },
	{ template: '{business} helps {audience} with {action}', accepts: { business: 'nonempty', audience: 'pluralGroup', action: 'nounPhrase' } },
	{ template: '{business} makes {action} feel {toneWord}', accepts: { business: 'nonempty', action: 'nounPhrase', toneWord: 'adjective' } },
	{ template: '{toneWord} {action} for {audience}', accepts: { toneWord: 'adjective', action: 'nounPhrase', audience: 'pluralGroup' } },
	{ template: '{business} brings {toneWord} {action}', accepts: { business: 'nonempty', toneWord: 'adjective', action: 'nounPhrase' } },
	{ template: '{business}: {toneWord} {action}', accepts: { business: 'nonempty', toneWord: 'adjective', action: 'nounPhrase' } },
	{ template: '{business} {benefit}', accepts: { business: 'nonempty', benefit: 'thirdPersonVerb' } },
	{ template: '{business} helps you {benefit}', accepts: { business: 'nonempty', benefit: 'infinitiveVerb' } },
	{ template: '{action}, made for {audience}', accepts: { action: 'nounPhrase', audience: 'pluralGroup' } },
	{ template: '{audience} get {action}', accepts: { audience: 'pluralGroup', action: 'nounPhrase' } },
	{ template: '{business} for {audience}: {action}', accepts: { business: 'nonempty', audience: 'pluralGroup', action: 'nounPhrase' } },
	{ template: 'Better {action} for {audience}', accepts: { action: 'nounPhrase', audience: 'pluralGroup' } },
];
