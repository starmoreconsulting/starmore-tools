import type { LogoArrangement, LogoIndustry, LogoStyle } from '../model/types';

export interface IndustryTemplateCategory {
	industry: LogoIndustry;
	slug: string;
	sampleName: string;
	tagline: string;
	style: LogoStyle;
	arrangement: LogoArrangement;
	description: string;
	metaDescription: string;
	indexable: boolean;
}

export const industryTemplateCategories: IndustryTemplateCategory[] = [
	{ industry: 'Technology', slug: 'technology', sampleName: 'Northstar Systems', tagline: 'Ideas into impact', style: 'Futuristic', arrangement: 'icon-left', description: 'Explore clean, forward-looking logo concepts for software, technology, and digital product brands.', metaDescription: 'Generate technology logo concepts pairing forward-looking symbols with clear wordmarks for software, devices, and digital services.', indexable: false },
	{ industry: 'Business', slug: 'business', sampleName: 'Alder & Co.', tagline: 'Built on trust', style: 'Corporate', arrangement: 'icon-left', description: 'Browse confident wordmarks and considered symbols for consultancies, firms, and professional services.', metaDescription: 'Shape a professional identity with business logo concepts for consultancies, firms, and service providers.', indexable: false },
	{ industry: 'Fashion', slug: 'fashion', sampleName: 'Studio Marais', tagline: 'Wear your story', style: 'Elegant', arrangement: 'badge', description: 'Explore polished, expressive marks suited to fashion labels, boutiques, and independent designers.', metaDescription: 'Explore fashion logo directions balancing distinctive lettering and refined marks for labels, boutiques, and independent designers.', indexable: false },
	{ industry: 'Construction', slug: 'construction', sampleName: 'Stonebridge Works', tagline: 'Made to last', style: 'Bold', arrangement: 'icon-above-text', description: 'See sturdy, legible logo directions for builders, contractors, and makers.', metaDescription: 'Build construction logo concepts with sturdy forms and readable names for contractors, builders, and trades.', indexable: false },
	{ industry: 'Food', slug: 'food', sampleName: 'Sage & Spoon', tagline: 'Gather around', style: 'Playful', arrangement: 'icon-above-text', description: 'Browse warm, welcoming concepts for cafes, kitchens, food brands, and neighborhood restaurants.', metaDescription: 'Create food brand logo ideas around inviting lettering and memorable marks for cafes, kitchens, and restaurants.', indexable: false },
	{ industry: 'Transport', slug: 'transport', sampleName: 'Open Road Freight', tagline: 'Moving forward', style: 'Modern', arrangement: 'icon-above-text', description: 'Explore clear, energetic logo ideas for delivery, mobility, and transport businesses.', metaDescription: 'Design transport logo concepts that communicate movement and reliability for delivery, mobility, and freight brands.', indexable: false },
	{ industry: 'Education', slug: 'education', sampleName: 'Brightpath Learning', tagline: 'Curiosity grows here', style: 'Professional', arrangement: 'icon-above-text', description: 'See approachable, purposeful designs for schools, tutors, and learning communities.', metaDescription: 'Develop education logo ideas that feel clear and welcoming for schools, tutors, and learning communities.', indexable: false },
	{ industry: 'Health', slug: 'health', sampleName: 'Kindred Health', tagline: 'Care that connects', style: 'Minimalist', arrangement: 'icon-above-text', description: 'Browse calm, reassuring logo concepts for wellness, care, and health services.', metaDescription: 'Find health logo directions using calm, legible forms for wellness practices, care providers, and health services.', indexable: false },
	{ industry: 'Creative', slug: 'creative', sampleName: 'Morrow Creative', tagline: 'Make room for ideas', style: 'Abstract', arrangement: 'icon-above-text', description: 'Explore expressive marks for studios, artists, photographers, and creative businesses.', metaDescription: 'Craft creative business logo concepts for studios, artists, photographers, and independent makers.', indexable: false },
	{ industry: 'General', slug: 'general', sampleName: 'Juniper & Stone', tagline: 'A good place to begin', style: 'Modern', arrangement: 'icon-above-text', description: 'Browse versatile logo concepts that can spark ideas for a business in any field.', metaDescription: 'Compare adaptable logo concepts for businesses seeking a starting point across varied industries.', indexable: false },
];
