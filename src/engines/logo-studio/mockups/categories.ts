import type { MockupCategory } from './scenes/types';

export interface MockupCategoryPage {
	slug: string;
	name: MockupCategory;
	title: string;
	description: string;
}

export const mockupCategoryPages: MockupCategoryPage[] = [
	{ slug: 'business-cards', name: 'Business cards', title: 'Business card logo mockups', description: 'Compare your logo on a two-sided card stack and a single card on a desk. Check how your mark reads at real stationery scale.' },
	{ slug: 'stationery', name: 'Stationery', title: 'Stationery logo mockups', description: 'Preview a coordinated logo placement on an A4 letterhead and a business envelope, with quiet room for everyday correspondence.' },
	{ slug: 'signage', name: 'Signage', title: 'Office signage mockups', description: 'See how a wordmark works as a dimensional office wall sign or a subtle vinyl mark on a glass door.' },
	{ slug: 'packaging', name: 'Packaging', title: 'Product packaging mockups', description: 'Place your logo on a folding carton, a cushioned mailer, or a wrap-around bottle label before preparing production artwork.' },
	{ slug: 'apparel', name: 'Apparel', title: 'T-shirt logo mockups', description: 'Check the same chest placement on light and dark cotton to spot contrast or sizing issues early.' },
	{ slug: 'retail', name: 'Retail', title: 'Retail bag logo mockups', description: 'Explore a centred logo on a kraft-paper shopping bag and consider how your identity carries through a customer handoff.' },
	{ slug: 'drinkware', name: 'Drinkware', title: 'Mug logo mockups', description: 'Preview a front-facing print on a glazed ceramic mug with gentle curvature and a soft studio shadow.' },
	{ slug: 'social', name: 'Social', title: 'Social profile logo mockups', description: 'Check a mark inside circular social and messaging avatars where fine details and small text can disappear.' },
	{ slug: 'digital', name: 'Digital', title: 'Website header logo mockups', description: 'Place your horizontal logo in a browser-style navigation bar and inspect its spacing beside a sample page layout.' },
];
