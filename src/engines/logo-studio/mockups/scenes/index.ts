import type { MockupScene } from './types';

const palette = (
	paper = '#f5f0e5',
	fabric = '#e8e4d8',
	wall = '#d9d4c9',
	product = '#d8b783',
	surface = '#a99d88',
	accent = '#c49b58',
): MockupScene['colors'] => ({
	paper: { name: 'Paper', value: paper },
	fabric: { name: 'Fabric', value: fabric },
	wall: { name: 'Wall', value: wall },
	product: { name: 'Product', value: product },
	surface: { name: 'Surface', value: surface },
	accent: { name: 'Accent', value: accent },
});

const slot = (
	id: string, x: number, y: number, width: number, height: number,
	preferredVariant: string, surfaceParameter: keyof MockupScene['colors'],
	options: Partial<MockupScene['slots'][number]> = {},
): MockupScene['slots'][number] => ({
	id, x, y, width, height, padding: 18, rotation: 0, opacity: 1,
	preferredVariant, surfaceParameter, ...options,
});

export const mockupScenes: MockupScene[] = [
	{
		id: 'business-cards-stack', name: 'Business card front and back', category: 'Business cards',
		description: 'A two-sided card stack on a softly lit tabletop.',
		viewBox: '0 0 720 520', colors: palette(),
		background: `<defs><linearGradient id="desk" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#6f6658"/></linearGradient><linearGradient id="front" x2="1" y2="1"><stop stop-color="{{paper}}"/><stop offset="1" stop-color="#fff"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="11"/></filter></defs>
			<rect width="720" height="520" fill="url(#desk)"/><path d="M0 370 Q220 320 450 400 T720 360V520H0Z" fill="#ffffff" opacity=".08"/>
			<ellipse cx="355" cy="320" rx="270" ry="115" fill="#251e17" opacity=".35" filter="url(#soft)"/>
			<g transform="rotate(-8 350 255)"><rect x="98" y="115" width="510" height="300" rx="9" fill="#333" opacity=".22"/><rect x="88" y="102" width="510" height="300" rx="8" fill="{{accent}}"/><rect x="98" y="112" width="490" height="280" rx="4" fill="{{product}}"/>
			<rect x="122" y="140" width="442" height="224" fill="#ffffff" opacity=".08"/></g>
			<g transform="rotate(7 355 245)"><rect x="120" y="80" width="500" height="295" rx="8" fill="#28231e" opacity=".28"/><rect x="110" y="68" width="500" height="295" rx="7" fill="url(#front)"/></g>`,
		slots: [
			slot('back', 180, 158, 355, 168, 'primary', 'product', { rotation: -8, padding: 28, opacity: 0.96, blendMode: 'multiply' }),
			slot('front', 185, 143, 355, 166, 'primary', 'paper', { rotation: 7, padding: 32 }),
		],
	},
	{
		id: 'business-card-desk', name: 'Single card on a desk', category: 'Business cards',
		description: 'A clean single-sided card with a natural tabletop shadow.',
		viewBox: '0 0 720 520', colors: palette('#fbf8ef', '#ece7d9', '#ddd6c9', '#d2b685', '#887d6e', '#b7955e'),
		background: `<defs><linearGradient id="desk2" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#756b5d"/></linearGradient><linearGradient id="card" x2="1" y2="1"><stop stop-color="{{paper}}"/><stop offset="1" stop-color="#fff"/></linearGradient><filter id="shadow2"><feGaussianBlur stdDeviation="13"/></filter></defs>
			<rect width="720" height="520" fill="url(#desk2)"/><path d="M0 40L720 0V80L0 170Z" fill="#fff" opacity=".06"/><ellipse cx="364" cy="290" rx="250" ry="130" fill="#201a14" opacity=".4" filter="url(#shadow2)"/>
			<g transform="rotate(-5 360 260)"><rect x="108" y="112" width="510" height="300" rx="12" fill="#fff" opacity=".12"/><rect x="104" y="105" width="510" height="300" rx="9" fill="url(#card)"/><path d="M104 330 Q320 280 614 340V405H104Z" fill="{{accent}}" opacity=".12"/></g>`,
		slots: [slot('front', 183, 166, 352, 166, 'primary', 'paper', { rotation: -5, padding: 34 })],
	},
	{
		id: 'letterhead-a4', name: 'A4 letterhead', category: 'Stationery',
		description: 'A crisp letterhead with subtle placeholders for body copy.',
		viewBox: '0 0 600 760', colors: palette('#fffefa', '#ece7d9', '#ddd6c9', '#d2b685', '#918878', '#b7955e'),
		background: `<defs><linearGradient id="paperGlow" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="{{paper}}"/></linearGradient><filter id="paperShadow"><feGaussianBlur stdDeviation="12"/></filter></defs>
			<rect width="600" height="760" fill="{{surface}}"/><rect x="63" y="40" width="486" height="680" rx="7" fill="#211b13" opacity=".22" filter="url(#paperShadow)"/><rect x="58" y="34" width="486" height="680" rx="4" fill="url(#paperGlow)"/>
			<path d="M92 150H510" stroke="{{accent}}" stroke-width="2"/><g stroke="#c9c6bf" stroke-width="4" opacity=".65"><path d="M92 232H493M92 265H508M92 298H478M92 355H508M92 388H501M92 421H504M92 454H460M92 511H506M92 544H487M92 577H500M92 610H350"/></g>`,
		slots: [slot('header', 90, 68, 220, 68, 'horizontal', 'paper', { padding: 8 })],
	},
	{
		id: 'envelope', name: 'Business envelope', category: 'Stationery',
		description: 'A folded envelope on a warm writing desk.',
		viewBox: '0 0 720 520', colors: palette('#f6f1e7', '#e9e1d3', '#d7cec0', '#e5d7bd', '#8e8171', '#b4925b'),
		background: `<defs><linearGradient id="envbg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#61584e"/></linearGradient><filter id="envShadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="720" height="520" fill="url(#envbg)"/><ellipse cx="365" cy="300" rx="260" ry="116" fill="#17130f" opacity=".4" filter="url(#envShadow)"/>
			<path d="M100 152Q360 70 620 152V392Q360 455 100 392Z" fill="{{paper}}" stroke="#d3c8b7" stroke-width="3"/><path d="M100 152L360 325L620 152" fill="#fff" opacity=".55" stroke="#ded4c5" stroke-width="3"/><path d="M100 392L286 265M620 392L434 265" fill="none" stroke="#d4c8b8" stroke-width="2"/>`,
		slots: [slot('return-address', 130, 170, 170, 90, 'primary', 'paper', { preferredVariant: 'horizontal', padding: 12 })],
	},
	{
		id: 'wall-sign', name: 'Office wall sign', category: 'Signage',
		description: 'A dimensional wall plaque with soft, realistic lighting.',
		viewBox: '0 0 720 520', colors: palette('#eee9df', '#e6e1d7', '#c8c0b3', '#c4aa7e', '#b9b1a5', '#a88d60'),
		background: `<defs><linearGradient id="wall" x2="0" y2="1"><stop stop-color="{{wall}}"/><stop offset="1" stop-color="#ada69a"/></linearGradient><linearGradient id="plaque" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="{{paper}}"/></linearGradient><filter id="wallShadow"><feGaussianBlur stdDeviation="15"/></filter></defs><rect width="720" height="520" fill="url(#wall)"/><path d="M0 405H720" stroke="#8e877d" stroke-width="4" opacity=".3"/><ellipse cx="360" cy="290" rx="270" ry="95" fill="#28231b" opacity=".3" filter="url(#wallShadow)"/><rect x="95" y="155" width="530" height="230" rx="17" fill="#9a7848" opacity=".7"/><rect x="107" y="145" width="506" height="220" rx="12" fill="url(#plaque)"/><path d="M130 168H590V342H130Z" fill="none" stroke="{{accent}}" stroke-width="2" opacity=".65"/>`,
		slots: [slot('sign', 175, 210, 370, 92, 'horizontal', 'paper', { padding: 18 })],
	},
	{
		id: 'glass-door', name: 'Glass office door', category: 'Signage',
		description: 'Frosted glass, dark framing, and a vinyl logo treatment.',
		viewBox: '0 0 600 720', colors: palette('#e9eef0', '#dce4e5', '#d8dedc', '#9caaab', '#718082', '#a8bdba'),
		background: `<defs><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#dae6e8"/><stop offset=".45" stop-color="#a8bdc2"/><stop offset="1" stop-color="#e7ece8"/></linearGradient><linearGradient id="hall" x2="0" y2="1"><stop stop-color="#f8f6ef"/><stop offset="1" stop-color="#b6b2a7"/></linearGradient></defs><rect width="600" height="720" fill="url(#hall)"/><path d="M0 0H120V720H0Z" fill="#77766e"/><rect x="122" y="24" width="426" height="672" rx="3" fill="url(#glass)" stroke="#4e5654" stroke-width="13"/><path d="M142 320H528V610H142Z" fill="#fff" opacity=".18"/><path d="M482 360V474" stroke="#575b57" stroke-width="12" stroke-linecap="round"/><circle cx="482" cy="417" r="20" fill="{{accent}}" opacity=".7"/><path d="M154 110L526 44V230L154 300Z" fill="#fff" opacity=".18"/>`,
		slots: [slot('vinyl', 225, 175, 230, 160, 'white', 'wall', { padding: 18, opacity: 0.76, blendMode: 'multiply' })],
	},
	{
		id: 'packaging-box', name: 'Product packaging box', category: 'Packaging',
		description: 'A folded carton with visible front and side panels.',
		viewBox: '0 0 720 560', colors: palette('#f5efe2', '#ddd4c3', '#cfc5b2', '#c99f66', '#8b7a64', '#b68f58'),
		background: `<defs><linearGradient id="boxbg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#615748"/></linearGradient><linearGradient id="boxfront" x2="1" y2="1"><stop stop-color="{{product}}"/><stop offset="1" stop-color="#b5844d"/></linearGradient><filter id="boxShadow"><feGaussianBlur stdDeviation="15"/></filter></defs><rect width="720" height="560" fill="url(#boxbg)"/><ellipse cx="365" cy="440" rx="260" ry="55" fill="#21190f" opacity=".42" filter="url(#boxShadow)"/><path d="M155 175L385 95L585 180L355 265Z" fill="#e0bc8c"/><path d="M155 175L355 265V448L155 360Z" fill="{{accent}}"/><path d="M355 265L585 180V365L355 448Z" fill="url(#boxfront)"/><path d="M385 95L585 180L355 265L155 175Z" fill="#fff" opacity=".12"/>`,
		slots: [slot('front-panel', 385, 292, 152, 118, 'primary', 'product', { rotation: -20, skewX: -16, padding: 12, blendMode: 'multiply' })],
	},
	{
		id: 'mailer-bag', name: 'Branded mailer bag', category: 'Packaging',
		description: 'A cushioned mailer with a sealed flap and soft creases.',
		viewBox: '0 0 720 560', colors: palette('#f3eee4', '#d7cfbf', '#c8bfae', '#d3b88c', '#8e826f', '#b49460'),
		background: `<defs><linearGradient id="mailerbg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#625b50"/></linearGradient><linearGradient id="mailer" x2="0" y2="1"><stop stop-color="{{product}}"/><stop offset="1" stop-color="#b79b70"/></linearGradient><filter id="mailerShadow"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="720" height="560" fill="url(#mailerbg)"/><ellipse cx="360" cy="442" rx="235" ry="60" fill="#211a12" opacity=".4" filter="url(#mailerShadow)"/><path d="M180 104Q355 74 536 116L570 404Q361 468 145 404Z" fill="url(#mailer)" stroke="#a78b61" stroke-width="4"/><path d="M180 104L265 166H463L536 116" fill="#e7d4b3" opacity=".8"/><path d="M154 350Q356 386 562 347" fill="none" stroke="#fff" stroke-width="5" opacity=".3"/>`,
		slots: [slot('mailer-mark', 246, 216, 225, 118, 'primary', 'product', { padding: 20, rotation: 2, blendMode: 'multiply' })],
	},
	{
		id: 'tshirt-light', name: 'Light T-shirt', category: 'Apparel',
		description: 'A light cotton tee with natural folds and a chest print.',
		viewBox: '0 0 600 640', colors: palette('#faf7ed', '#f4f1e8', '#d7d2c8', '#ddd7cb', '#999184', '#b59a6a'),
		background: `<defs><linearGradient id="teeBg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#6f695e"/></linearGradient><linearGradient id="tee" x2="1" y2="1"><stop stop-color="{{fabric}}"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#d9d5cb"/></linearGradient><filter id="teeShadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="600" height="640" fill="url(#teeBg)"/><ellipse cx="300" cy="562" rx="185" ry="35" fill="#18140f" opacity=".35" filter="url(#teeShadow)"/><path d="M215 96L263 72Q300 126 337 72L385 96L493 164L425 260L382 232L398 505Q300 540 202 505L218 232L175 260L107 164Z" fill="url(#tee)" stroke="#c8c4ba" stroke-width="3"/><path d="M263 72Q300 114 337 72M217 233Q253 269 280 300M383 233Q351 270 322 300" fill="none" stroke="#bdb9af" stroke-width="5" opacity=".6"/>`,
		slots: [slot('chest-print', 238, 230, 125, 108, 'primary', 'fabric', { padding: 12 })],
	},
	{
		id: 'tshirt-dark', name: 'Dark T-shirt', category: 'Apparel',
		description: 'A deep charcoal cotton tee, best previewed with a white logo.',
		viewBox: '0 0 600 640', colors: palette('#ece8de', '#24272a', '#d7d2c8', '#35383b', '#928b80', '#bca06e'),
		background: `<defs><linearGradient id="teeBgDark" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#5a544c"/></linearGradient><linearGradient id="teeDark" x2="1" y2="1"><stop stop-color="#45494c"/><stop offset=".5" stop-color="{{fabric}}"/><stop offset="1" stop-color="#17191b"/></linearGradient><filter id="teeDarkShadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="600" height="640" fill="url(#teeBgDark)"/><ellipse cx="300" cy="562" rx="185" ry="35" fill="#17130f" opacity=".45" filter="url(#teeDarkShadow)"/><path d="M215 96L263 72Q300 126 337 72L385 96L493 164L425 260L382 232L398 505Q300 540 202 505L218 232L175 260L107 164Z" fill="url(#teeDark)" stroke="#151719" stroke-width="3"/><path d="M263 72Q300 114 337 72M217 233Q253 269 280 300M383 233Q351 270 322 300" fill="none" stroke="#707477" stroke-width="5" opacity=".45"/>`,
		slots: [slot('chest-print', 238, 230, 125, 108, 'white', 'fabric', { padding: 12, blendMode: 'screen' })],
	},
	{
		id: 'shopping-bag', name: 'Paper shopping bag', category: 'Retail',
		description: 'A premium kraft shopping bag with cord handles.',
		viewBox: '0 0 720 580', colors: palette('#efe7d8', '#d9cfbd', '#ccc2b0', '#c9a878', '#8b7b66', '#b38d55'),
		background: `<defs><linearGradient id="bagBg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#61584b"/></linearGradient><linearGradient id="bag" x2="1" y2="1"><stop stop-color="{{product}}"/><stop offset="1" stop-color="#b59462"/></linearGradient><filter id="bagShadow"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="720" height="580" fill="url(#bagBg)"/><ellipse cx="362" cy="478" rx="190" ry="42" fill="#17130e" opacity=".42" filter="url(#bagShadow)"/><path d="M270 200V148Q270 74 352 74Q434 74 434 148V200" fill="none" stroke="#4c4031" stroke-width="13"/><path d="M225 184L490 184L520 445L194 445Z" fill="url(#bag)" stroke="#a7885c" stroke-width="4"/><path d="M225 184L194 445M490 184L520 445" stroke="#fff" stroke-width="5" opacity=".16"/><path d="M210 420L505 420" stroke="#765c39" stroke-width="4" opacity=".25"/>`,
		slots: [slot('bag-mark', 276, 250, 160, 136, 'primary', 'product', { padding: 18 })],
	},
	{
		id: 'ceramic-mug', name: 'Ceramic coffee mug', category: 'Drinkware',
		description: 'A glazed mug with a curved printable front and a soft tabletop shadow.',
		viewBox: '0 0 640 560', colors: palette('#f4efe5', '#e7e1d5', '#d2cbc0', '#f3f0e7', '#8e8374', '#b7955e'),
		background: `<defs><linearGradient id="mugBg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#655c50"/></linearGradient><linearGradient id="mugBody" x2="1"><stop stop-color="#d7d2c8"/><stop offset=".18" stop-color="{{product}}"/><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#c9c4ba"/></linearGradient><linearGradient id="coffee" x2="0" y2="1"><stop stop-color="#5a3822"/><stop offset="1" stop-color="#26180f"/></linearGradient><filter id="mugShadow"><feGaussianBlur stdDeviation="13"/></filter></defs><rect width="640" height="560" fill="url(#mugBg)"/><ellipse cx="314" cy="447" rx="204" ry="38" fill="#17130f" opacity=".42" filter="url(#mugShadow)"/><path d="M470 184Q567 154 572 245Q578 340 471 324" fill="none" stroke="#dedbd3" stroke-width="32"/><path d="M470 184Q550 169 552 244Q553 310 472 306" fill="none" stroke="#7f796f" stroke-width="5" opacity=".4"/><path d="M152 159Q308 127 470 159L456 394Q314 430 168 394Z" fill="url(#mugBody)" stroke="#c8c3b9" stroke-width="4"/><ellipse cx="311" cy="160" rx="159" ry="30" fill="#e1ddd5" stroke="#c3beb4" stroke-width="4"/><ellipse cx="311" cy="160" rx="136" ry="20" fill="url(#coffee)"/><path d="M177 185Q195 208 191 369" fill="none" stroke="#fff" stroke-width="13" opacity=".28"/>`,
		slots: [slot('mug-print', 240, 216, 152, 116, 'primary', 'product', { padding: 14, skewX: -4, blendMode: 'multiply' })],
	},
	{
		id: 'social-profile', name: 'Social profile image', category: 'Social',
		description: 'A profile page with the logo clipped to a round avatar.',
		viewBox: '0 0 720 560', colors: palette('#fff', '#f2f0f0', '#f6f6f6', '#ece9e6', '#ddd9d2', '#e0a071'),
		background: `<defs><linearGradient id="phone" x2="1" y2="1"><stop stop-color="#d4a0cb"/><stop offset=".5" stop-color="#e2aa79"/><stop offset="1" stop-color="#7b80c9"/></linearGradient><filter id="phoneShadow"><feGaussianBlur stdDeviation="13"/></filter></defs><rect width="720" height="560" fill="{{surface}}"/><rect x="142" y="38" width="436" height="484" rx="27" fill="#201d1b" opacity=".2" filter="url(#phoneShadow)"/><rect x="142" y="28" width="436" height="484" rx="27" fill="#fff" stroke="#ddd" stroke-width="2"/><path d="M142 102H578" stroke="#eee" stroke-width="2"/><circle cx="184" cy="65" r="13" fill="url(#phone)"/><path d="M211 60H360M211 73H317" stroke="#777" stroke-width="5" stroke-linecap="round"/><rect x="168" y="130" width="92" height="92" rx="46" fill="url(#phone)"/><path d="M282 156H475M282 185H430" stroke="#c6c3c0" stroke-width="9" stroke-linecap="round"/><rect x="168" y="251" width="384" height="210" rx="9" fill="#f3f0ed"/><path d="M181 426L290 325L356 388L434 300L539 409V452H181Z" fill="#d8cfc4" opacity=".7"/>`,
		slots: [slot('profile-avatar', 178, 140, 70, 70, 'primary', 'accent', { clip: { shape: 'circle', x: 0, y: 0, radius: 300 }, padding: 42 })],
	},
	{
		id: 'whatsapp-avatar', name: 'Messaging app avatar', category: 'Social',
		description: 'A simple messaging contact card with a round logo avatar.',
		viewBox: '0 0 720 560', colors: palette('#fff', '#f1f2eb', '#e9ede5', '#d7e4d5', '#b1c1ad', '#6bb58b'),
		background: `<defs><linearGradient id="chatBg" x2="0" y2="1"><stop stop-color="#e8eee8"/><stop offset="1" stop-color="#d1dfd2"/></linearGradient><filter id="chatShadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="720" height="560" fill="url(#chatBg)"/><rect x="124" y="58" width="472" height="444" rx="18" fill="#19231e" opacity=".16" filter="url(#chatShadow)"/><rect x="124" y="48" width="472" height="444" rx="18" fill="#f9faf7"/><path d="M124 108H596" stroke="#e4e9e1" stroke-width="2"/><circle cx="165" cy="78" r="8" fill="#8bb792"/><path d="M153 75H177M165 63V87" stroke="#fff" stroke-width="2"/><circle cx="218" cy="183" r="55" fill="{{accent}}"/><path d="M310 164H517M310 193H458" stroke="#cccfc9" stroke-width="10" stroke-linecap="round"/><path d="M152 275H568M152 340H568M152 405H568" stroke="#e5e8e2" stroke-width="2"/><circle cx="174" cy="307" r="14" fill="#9db99c"/><circle cx="174" cy="373" r="14" fill="#bacab6"/>`,
		slots: [slot('avatar', 177, 142, 82, 82, 'primary', 'accent', { clip: { shape: 'circle', x: 0, y: 0, radius: 300 }, padding: 40 })],
	},
	{
		id: 'website-header', name: 'Website header', category: 'Digital',
		description: 'A browser window showing the logo in a navigation bar.',
		viewBox: '0 0 760 520', colors: palette('#fff', '#f1f2f3', '#d9dde1', '#d7e2e8', '#7b8995', '#8fb2c4'),
		background: `<defs><linearGradient id="web" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#f2f5f7"/></linearGradient><filter id="webShadow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="760" height="520" fill="{{surface}}"/><rect x="55" y="60" width="650" height="408" rx="18" fill="#19232b" opacity=".18" filter="url(#webShadow)"/><rect x="55" y="48" width="650" height="408" rx="15" fill="url(#web)" stroke="#bfc6ca" stroke-width="2"/><path d="M55 92H705" fill="#e9edef" stroke="#c8ced1" stroke-width="2"/><circle cx="79" cy="70" r="6" fill="#db7b6f"/><circle cx="98" cy="70" r="6" fill="#dfc17a"/><circle cx="117" cy="70" r="6" fill="#83b18a"/><rect x="178" y="60" width="400" height="19" rx="9" fill="#fff"/><path d="M84 160H676" stroke="#e8ecee" stroke-width="2"/><rect x="85" y="235" width="270" height="145" rx="8" fill="{{accent}}" opacity=".16"/><path d="M390 250H654M390 278H622M390 306H642M390 350H542" stroke="#c7cdd0" stroke-width="8" stroke-linecap="round"/>`,
		slots: [slot('navigation-logo', 84, 112, 190, 38, 'horizontal', 'paper', { padding: 4 })],
	},
	{
		id: 'product-label', name: 'Product label on bottle', category: 'Packaging',
		description: 'A wrap label on a softly lit glass bottle.',
		viewBox: '0 0 600 700', colors: palette('#f4eee2', '#e4dfd4', '#c9c3b9', '#a6b0a4', '#77746d', '#b3925a'),
		background: `<defs><linearGradient id="bottleBg" x2="0" y2="1"><stop stop-color="{{surface}}"/><stop offset="1" stop-color="#625d55"/></linearGradient><linearGradient id="bottle" x2="1" y2="0"><stop stop-color="#6d8175"/><stop offset=".2" stop-color="#d8e0d5"/><stop offset=".5" stop-color="#91a193"/><stop offset=".85" stop-color="#526a5c"/><stop offset="1" stop-color="#b7c2b5"/></linearGradient><linearGradient id="label" x2="1"><stop stop-color="#c1aa7d"/><stop offset=".45" stop-color="{{paper}}"/><stop offset="1" stop-color="#c8b58c"/></linearGradient><filter id="bottleShadow"><feGaussianBlur stdDeviation="13"/></filter></defs><rect width="600" height="700" fill="url(#bottleBg)"/><ellipse cx="300" cy="626" rx="142" ry="31" fill="#15130f" opacity=".4" filter="url(#bottleShadow)"/><path d="M246 108V75Q246 47 274 47H326Q354 47 354 75V108L384 164Q410 208 411 287L425 582Q300 620 175 582L189 287Q190 208 216 164Z" fill="url(#bottle)" stroke="#56695e" stroke-width="4"/><rect x="246" y="60" width="108" height="74" rx="10" fill="{{accent}}" stroke="#88734d" stroke-width="4"/><path d="M193 314Q300 286 407 314L414 492Q300 518 186 492Z" fill="url(#label)" stroke="#b7a37d" stroke-width="3"/><path d="M197 332Q300 311 407 332" fill="none" stroke="#fff" stroke-width="5" opacity=".45"/>`,
		slots: [slot('wrap-label', 230, 361, 140, 95, 'primary', 'paper', { padding: 8, opacity: 0.94, blendMode: 'multiply' })],
	},
];

export const mockupCategories = Array.from(new Set(mockupScenes.map((scene) => scene.category)));

export { type MockupCategory, type MockupScene, type MockupSlot, type SceneColorParameter } from './types';
