import type { MockupCategory } from './scenes/types';

export interface MockupCategoryPage {
	slug: string;
	name: MockupCategory;
	title: string;
	description: string;
	metaDescription?: string;
	indexable: boolean;
}

export const mockupCategoryPages: MockupCategoryPage[] = [
	{ slug: 'business-cards', name: 'Business cards', title: 'Business card logo mockups', description: 'Compare your logo on a two-sided card stack and a single card on a desk. Check how your mark reads at real stationery scale.', indexable: false },
	{ slug: 'stationery', name: 'Stationery', title: 'Stationery logo mockups', description: 'Preview a coordinated logo placement on an A4 letterhead and a business envelope, with quiet room for everyday correspondence.', indexable: false },
	{ slug: 'signage', name: 'Signage', title: 'Office signage mockups', description: 'See how a wordmark works as a dimensional office wall sign or a subtle vinyl mark on a glass door.', metaDescription: 'Preview a logo on dimensional office signs or glass-door vinyl to assess contrast and visibility.', indexable: false },
	{ slug: 'packaging', name: 'Packaging', title: 'Product packaging mockups', description: 'Place your logo on a folding carton, a cushioned mailer, or a wrap-around bottle label before preparing production artwork.', indexable: false },
	{ slug: 'apparel', name: 'Apparel', title: 'T-shirt logo mockups', description: 'Check the same chest placement on light and dark cotton to spot contrast or sizing issues early.', metaDescription: 'Check your logo on light and dark T-shirts to compare chest placement, contrast, and scale.', indexable: false },
	{ slug: 'retail', name: 'Retail', title: 'Retail bag logo mockups', description: 'Explore a centred logo on a kraft-paper shopping bag and consider how your identity carries through a customer handoff.', indexable: false },
	{ slug: 'drinkware', name: 'Drinkware', title: 'Mug logo mockups', description: 'Preview a front-facing print on a glazed ceramic mug with gentle curvature and a soft studio shadow.', indexable: false },
	{ slug: 'social', name: 'Social', title: 'Social profile logo mockups', description: 'Check a mark inside circular social and messaging avatars where fine details and small text can disappear.', metaDescription: 'See how your logo reads in circular social and messaging avatars where fine details can disappear.', indexable: false },
	{ slug: 'digital', name: 'Digital', title: 'Website header logo mockups', description: 'Place your horizontal logo in a browser-style navigation bar and inspect its spacing beside a sample page layout.', indexable: false },
];
