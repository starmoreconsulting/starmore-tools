import type { LogoArrangement, LogoIndustry, LogoStyle } from '../model/types';

export interface IndustryTemplateCategory {
	industry: LogoIndustry;
	slug: string;
	sampleName: string;
	tagline: string;
	style: LogoStyle;
	arrangement: LogoArrangement;
	description: string;
}

export const industryTemplateCategories: IndustryTemplateCategory[] = [
	{ industry: 'Technology', slug: 'technology', sampleName: 'Northstar Systems', tagline: 'Ideas into impact', style: 'Futuristic', arrangement: 'icon-left', description: 'Explore clean, forward-looking logo concepts for software, technology, and digital product brands.' },
	{ industry: 'Business', slug: 'business', sampleName: 'Alder & Co.', tagline: 'Built on trust', style: 'Corporate', arrangement: 'icon-left', description: 'Browse confident wordmarks and considered symbols for consultancies, firms, and professional services.' },
	{ industry: 'Fashion', slug: 'fashion', sampleName: 'Studio Marais', tagline: 'Wear your story', style: 'Elegant', arrangement: 'badge', description: 'Explore polished, expressive marks suited to fashion labels, boutiques, and independent designers.' },
	{ industry: 'Construction', slug: 'construction', sampleName: 'Stonebridge Works', tagline: 'Made to last', style: 'Bold', arrangement: 'icon-above-text', description: 'See sturdy, legible logo directions for builders, contractors, and makers.' },
	{ industry: 'Food', slug: 'food', sampleName: 'Sage & Spoon', tagline: 'Gather around', style: 'Playful', arrangement: 'icon-above-text', description: 'Browse warm, welcoming concepts for cafes, kitchens, food brands, and neighborhood restaurants.' },
	{ industry: 'Transport', slug: 'transport', sampleName: 'Open Road Freight', tagline: 'Moving forward', style: 'Modern', arrangement: 'icon-above-text', description: 'Explore clear, energetic logo ideas for delivery, mobility, and transport businesses.' },
	{ industry: 'Education', slug: 'education', sampleName: 'Brightpath Learning', tagline: 'Curiosity grows here', style: 'Professional', arrangement: 'icon-above-text', description: 'See approachable, purposeful designs for schools, tutors, and learning communities.' },
	{ industry: 'Health', slug: 'health', sampleName: 'Kindred Health', tagline: 'Care that connects', style: 'Minimalist', arrangement: 'icon-above-text', description: 'Browse calm, reassuring logo concepts for wellness, care, and health services.' },
	{ industry: 'Creative', slug: 'creative', sampleName: 'Morrow Creative', tagline: 'Make room for ideas', style: 'Abstract', arrangement: 'icon-above-text', description: 'Explore expressive marks for studios, artists, photographers, and creative businesses.' },
	{ industry: 'General', slug: 'general', sampleName: 'Juniper & Stone', tagline: 'A good place to begin', style: 'Modern', arrangement: 'icon-above-text', description: 'Browse versatile logo concepts that can spark ideas for a business in any field.' },
];
