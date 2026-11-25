/**
 * ============================================================================
 * CONFIG_DEFAULTS: রেস্তোরাঁ কনফিগারেশন, মেনু, ডেলিভারি জোন ও মেটা ট্র্যাকিং
 * ============================================================================
 * অ্যাডমিন প্যানেল থেকে পরিবর্তন করলে সবকিছু localStorage-এ সংরক্ষিত হয়।
 * পরবর্তীতে স্থায়ীভাবে কোডে বসাতে চাইলে অ্যাডমিন প্যানেল থেকে JSON কপি করে এখানে বসাতে পারেন।
 */

export type MenuCategory =
  | 'স্পেশাল কাচ্চি ও তেহারি'
  | 'কাবাব ও স্টার্টার'
  | 'ডেজার্ট ও পানীয়';

export type StoreStatusMode = 'auto' | 'open' | 'preorder';

export interface RestaurantInfo {
  brandName: string;
  heritageOrigin: string;
  logoUrl: string;
  whatsappNumber: string;
  whatsappRedirectEnabled: boolean;
  displayPhone: string;
  email: string;
  address: string;
  hoursDisplay: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  statusMode: StoreStatusMode;
  adminPin: string;
  mapsCoordinates: string;
  mapsUrl: string;
  facebookUrl: string;
  instagramUrl: string;
}

export interface DeliverySubArea {
  id: string;
  name: string;
  fee?: number;
  eta?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  eta: string;
  isOutOfArea?: boolean;
  note?: string;
  subAreas?: DeliverySubArea[];
  sortOrder?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  servingSize: string;
  price: number;
  image: string;
  available: boolean;
  preOrderOnly: boolean;
  advanceNotice?: string;
  sortOrder?: number;
}

export interface HeritageDish {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  story: string;
  pairing: string;
  price: number;
  servingSize: string;
  image: string;
  menuItemId: string;
}

export interface CustomerReview {
  id: string;
  author: string;
  location: string;
  rating: number;
  dishOrdered: string;
  dateLabel: string;
  quote: string;
}

export interface SiteContent {
  navbar: {
    heritageLabel: string;
    menuLabel: string;
    cateringLabel: string;
    contactLabel: string;
    trackLabel: string;
    cartLabel: string;
  };
  hero: {
    heroImageUrl: string;
    headline: string;
    description: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    trackCtaLabel: string;
    zoneCheckerTitle: string;
    zoneSelectLabel: string;
    statusOpenBadge: string;
    statusPreorderBadge: string;
    statusOpenDetail: string;
    statusPreorderDetail: string;
    statusClosedDetail: string;
  };
  heritage: {
    eyebrow: string;
    heading: string;
    subheading: string;
    dishes: HeritageDish[];
  };
  menu: {
    eyebrow: string;
    heading: string;
    preOrderFilterLabel: string;
    orderButtonLabel: string;
    outOfStockLabel: string;
  };
  catering: {
    eyebrow: string;
    heading: string;
    description: string;
    highlight1Title: string;
    highlight1Text: string;
    highlight2Title: string;
    highlight2Text: string;
    formTitle: string;
    formSubtitle: string;
    submitButtonLabel: string;
  };
  reviews: {
    eyebrow: string;
    heading: string;
    ratingBadgeText: string;
    verifiedLabel: string;
    items: CustomerReview[];
  };
  footer: {
    aboutDescription: string;
    quickLinksHeading: string;
    socialHeading: string;
    mapHeaderLabel: string;
    mapLocationNote: string;
    mapFooterLabel: string;
    mapButtonLabel: string;
    copyrightText: string;
    bottomNote: string;
  };
}

export interface MetaTrackingConfig {
  enabled: boolean;
  pixelId: string;
  capiEnabled?: boolean;
  capiAccessToken: string;
  capiEndpointUrl: string;
  testEventCode: string;
  debugConsole: boolean;
}

export interface AppConfig {
  restaurantInfo: RestaurantInfo;
  siteContent: SiteContent;
  deliveryZones: DeliveryZone[];
  menuItems: MenuItem[];
  metaConfig: MetaTrackingConfig;
}

export const MENU_CATEGORIES: Array<'সব খাবার' | MenuCategory> = [
  'সব খাবার',
  'স্পেশাল কাচ্চি ও তেহারি',
  'কাবাব ও স্টার্টার',
  'ডেজার্ট ও পানীয়',
];

export const PREORDER_TIME_SLOTS: string[] = [
  'দুপুর ১:০০ - ২:৩০',
  'বিকাল ৪:৩০ - ৬:০০',
  'রাত ৮:০০ - ৯:৩০',
];

export const DEFAULT_HERITAGE_DISHES: HeritageDish[] = [
  {
    id: 'sig-kacchi',
    number: '০১',
    title: 'তামার হাঁড়ির খাঁটি মাটন কাচ্চি',
    subtitle: 'ধীর কাঠ-কয়লার দম · কাশ্মীরি জাফরান ও গাওয়া ঘি',
    story:
      'কাঁচা মসলাদার খাসির মাংস আর আধা-সেদ্ধ বাসমতি চাল একসাথে আটা দিয়ে হাঁড়ির মুখ বন্ধ করে দম দেওয়া হয়—যাতে প্রতিটি চালের দানায় হাড়ের মজ্জার আসল স্বাদ মিশে যায়।',
    pairing: 'সাথে দারুণ মানায়: ঐতিহ্যবাহী পুদিনা বোরহানি',
    price: 380,
    servingSize: '১ জনের জন্য',
    image: '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg',
    menuItemId: 'royal-mutton-kacchi-1-1',
  },
  {
    id: 'sig-tehari',
    number: '০২',
    title: 'পুরান ঢাকার চিনিগুঁড়া গরুর তেহারি',
    subtitle: 'খাঁটি ঘানির সরিষার তেল · আস্ত কাঁচামরিচের ঘ্রাণ',
    story:
      'আসল ঢাকাইয়া রীতি মেনে এতে কোনো ঘি বা কৃত্রিম রঙ ব্যবহার করা হয় না। খাঁটি সরিষার তেল ও ছোট দানার চিনিগুঁড়া চাল একে দেয় অতুলনীয় ঝাঁঝালো ঘ্রাণ।',
    pairing: 'সাথে দারুণ মানায়: গরুর জালি ও শামি কাবাব',
    price: 290,
    servingSize: '১ জনের ফুল প্লেট',
    image: '/src/assets/images/menu_beef_tehari_1794979672672.jpg',
    menuItemId: 'old-dhaka-beef-tehari',
  },
  {
    id: 'sig-raan',
    number: '০৩',
    title: 'নবাবী আস্ত খাসির রান রোস্ট',
    subtitle: '২৪ ঘণ্টার মসলা ম্যারিনেশন · দাওয়াত প্রি-অর্ডার',
    story:
      'পারিবারিক মিলনমেলা ও বিশেষ মেহমানদারির জন্য অগ্রিম অর্ডারে ধীরে ধীরে রোস্ট করা হয়, ওপরে থাকে পেস্তা কুচি ও জাফরানের সুবাস।',
    pairing: 'কমপক্ষে ৬ ঘণ্টা আগে অর্ডার করতে হবে',
    price: 2650,
    servingSize: '৪ জনের দাওয়াত প্ল্যাটার',
    image: '/src/assets/images/menu_raan_feast_1794979674245.jpg',
    menuItemId: 'whole-roast-khashi-raan',
  },
];

export const DEFAULT_CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    author: 'তারিকুল ইসলাম চৌধুরী',
    location: 'সদর বাজার',
    rating: 5,
    dishOrdered: 'নবাবী হাঁড়ি কাচ্চি ফ্যামিলি প্যাক',
    dateLabel: '২ সপ্তাহ আগে',
    quote:
      'বাবা-মায়ের বিবাহবার্ষিকীর জন্য দুটি মাটির হাঁড়ি প্রি-অর্ডার করেছিলাম। রাত ৮টার স্লটেই ধোঁয়া ওঠা গরম খাবার পৌঁছে দিয়েছে—মাংস এত নরম ছিল আর সুবাসে পুরো ঘর ভরে গিয়েছিল।',
  },
  {
    id: 'rev-2',
    author: 'ফারহানা ইয়াসমিন',
    location: 'সাহেবাবাদ',
    rating: 5,
    dishOrdered: 'গরুর তেহারি ও পুদিনা বোরহানি',
    dateLabel: '১ মাস আগে',
    quote:
      'এলাকায় এমন আসল চিনিগুঁড়া চালের সরিষার তেহারি আগে পাইনি। কোনো অতিরিক্ত রঙ নেই, ঝাল-মসলা একদম পরিমিত, আর পুদিনার বোরহানিটা একদম পুরান ঢাকার মতো।',
  },
  {
    id: 'rev-3',
    author: 'মাহমুদুল হাসান',
    location: 'মাধবপুর',
    rating: 5,
    dishOrdered: 'আস্ত খাসির রান রোস্ট প্ল্যাটার',
    dateLabel: '৩ সপ্তাহ আগে',
    quote:
      'শুক্রবার দুপুরের দাওয়াতের জন্য হোয়াটসঅ্যাপে ১ মিনিটেই প্রি-অর্ডার করলাম। ডেলিভারি চার্জ আগে থেকেই পরিষ্কার দেখানো ছিল, আর মাটির ভাঁড়ির ফিরনি সবার মন কেড়েছে।',
  },
];

export const DEFAULT_SITE_CONTENT: SiteContent = {
  navbar: {
    heritageLabel: 'স্পেশাল পদ',
    menuLabel: 'মেনু',
    cateringLabel: 'প্রি-অর্ডার',
    contactLabel: 'যোগাযোগ',
    trackLabel: 'অর্ডার ট্র্যাক',
    cartLabel: 'ব্যাগ',
  },
  hero: {
    heroImageUrl: '/src/assets/images/hero_royal_dastarkhwan_1794979671876.jpg',
    headline: 'তামার হাঁড়ির রাজকীয় কাচ্চি ও পুরান ঢাকার খাঁটি স্বাদ',
    description:
      'কাশ্মীরি জাফরান ও খাঁটি গাওয়া ঘিয়ে দম দেওয়া মাটন কাচ্চি, ঘানির সরিষার তেলের গরুর তেহারি ও কাঠ-কয়লার কাবাব—গরম গরম হোম ডেলিভারি নিন অথবা পারিবারিক দাওয়াতের জন্য আগেই প্রি-অর্ডার করুন।',
    primaryCtaLabel: 'মেনু দেখুন ও অর্ডার করুন',
    secondaryCtaLabel: 'বড় দাওয়াত ও প্রি-অর্ডার',
    trackCtaLabel: 'অর্ডার ট্র্যাক করুন',
    zoneCheckerTitle: 'ডেলিভারি এলাকা যাচাই করুন',
    zoneSelectLabel: 'আপনার এলাকা নির্বাচন করুন',
    statusOpenBadge: 'এখন অর্ডার নেওয়া হচ্ছে',
    statusPreorderBadge: 'প্রি-অর্ডার চলছে',
    statusOpenDetail: 'তাৎক্ষণিক হোম ডেলিভারি ও প্রি-অর্ডার চালু আছে',
    statusPreorderDetail: 'অগ্রিম অর্ডার দিন — নির্দিষ্ট সময়ে গরম খাবার পৌঁছে যাবে আপনার ঠিকানায়',
    statusClosedDetail: 'রান্নাঘর খোলে সকাল ১১:৩০ টায় — এখন দুপুর বা রাতের জন্য প্রি-অর্ডার করুন',
  },
  heritage: {
    eyebrow: 'বাবুর্চির বিশেষ আয়োজন',
    heading: 'তিন দশকের ঐতিহ্যে গড়া আমাদের সেরা তিনটি পদ',
    subheading:
      'শিলপাটায় বাটা খাঁটি মসলা, পুরনো সুগন্ধি চাল এবং কাঠ-কয়লার মৃদু আঁচে প্রতিটি হাঁড়ি অল্প অল্প করে যত্ন নিয়ে রান্না করা হয়।',
    dishes: DEFAULT_HERITAGE_DISHES,
  },
  menu: {
    eyebrow: 'আমাদের পূর্ণাঙ্গ মেনু',
    heading: 'পছন্দের খাবার বেছে নিন',
    preOrderFilterLabel: 'শুধুমাত্র প্রি-অর্ডার',
    orderButtonLabel: 'অর্ডার করুন',
    outOfStockLabel: 'বর্তমানে স্টক শেষ',
  },
  catering: {
    eyebrow: 'বড় দাওয়াত ও অগ্রিম ক্যাটারিং',
    heading: 'পারিবারিক অনুষ্ঠান ও বড় দাওয়াতের জন্য আস্ত হাঁড়ি প্রি-অর্ডার করুন',
    description:
      'জন্মদিন, বিবাহবার্ষিকী, গায়ে হলুদ কিংবা অফিসের মেহমানদারির জন্য ২০ থেকে ৩০০ জনের তাজা দম করা কাচ্চি হাঁড়ি, আস্ত খাসির রান রোস্ট ও কাস্টম ঝাল-মসলার অর্ডার নেওয়া হয়।',
    highlight1Title: 'অগ্রিম সময়সূচি',
    highlight1Text:
      'ফ্যামিলি প্যাকের জন্য ৪–৬ ঘণ্টা আগে এবং ৩০+ জনের অনুষ্ঠানের জন্য অন্তত ২৪ ঘণ্টা আগে জানান।',
    highlight2Title: 'পছন্দমতো ঝাল ও পরিবেশন',
    highlight2Text:
      'বয়স্কদের জন্য কম তেল বা হালকা ঝাল, বাড়তি আলুবোখারা ও আলাদা বোরহানির বোতল অনুরোধ করতে পারবেন।',
    formTitle: 'কাস্টম অর্ডার ও ক্যাটারিং ফর্ম',
    formSubtitle:
      'নিচের তথ্য পূরণ করে সরাসরি হোয়াটসঅ্যাপে আপনার অনুষ্ঠানের বিবরণ পাঠিয়ে দিন।',
    submitButtonLabel: 'হোয়াটসঅ্যাপে কাস্টম অর্ডার পাঠান',
  },
  reviews: {
    eyebrow: 'গ্রাহকদের মতামত',
    heading: 'পরিবার ও মেহমানদারিতে সবার ভরসা',
    ratingBadgeText: '৪.৯ / ৫.০',
    verifiedLabel: 'যাচাইকৃত গুগল ও হোয়াটসঅ্যাপ ক্রেতা',
    items: DEFAULT_CUSTOMER_REVIEWS,
  },
  footer: {
    aboutDescription:
      'কাঠ-কয়লার দমে রান্না করা তামার হাঁড়ির কাচ্চি, চিনিগুঁড়া গরুর তেহারি এবং নিরাপদ গরম হট-বক্স ডেলিভারি সেবা।',
    quickLinksHeading: 'দ্রুত লিংক',
    socialHeading: 'যুক্ত থাকুন',
    mapHeaderLabel: 'মূল রান্নাঘরের অবস্থান',
    mapLocationNote: 'কলেজ রোড, সদর বাজার · সরাসরি পিকআপ ও পার্কিং সুবিধা রয়েছে',
    mapFooterLabel: 'গুগল ম্যাপ লোকেশন',
    mapButtonLabel: 'ম্যাপে দিকনির্দেশনা দেখুন',
    copyrightText: 'সর্বস্বত্ব সংরক্ষিত।',
    bottomNote: 'ক্যাশ অন ডেলিভারি ও হোয়াটসঅ্যাপ প্রি-অর্ডার',
  },
};

export const CONFIG_DEFAULTS: AppConfig = {
  restaurantInfo: {
    brandName: 'আল-বারাকাহ্‌ কাচ্চি এন্ড তেহারি',
    heritageOrigin: 'প্রতিষ্ঠিত ১৯৯৪ · পুরান ঢাকার আসল স্বাদ ও ঐতিহ্য',
    logoUrl: '',
    whatsappNumber: '8801711000000',
    whatsappRedirectEnabled: true,
    displayPhone: '০১৭১১-০০০০০০',
    email: 'orders@albarakahkacchi.com',
    address: 'বাড়ি ২৪, কলেজ রোড, সদর বাজার, ব্রাহ্মণপাড়া, কুমিল্লা ৩৫২৬',
    hoursDisplay: 'প্রতিদিন: সকাল ১১:৩০ – রাত ১০:৩০',
    openHour: 11,
    openMinute: 30,
    closeHour: 22,
    closeMinute: 30,
    statusMode: 'auto',
    adminPin: '1234',
    mapsCoordinates: '২৩.৬২১৪° উঃ, ৯১.১১৪২° পূঃ',
    mapsUrl: 'https://maps.google.com/?q=23.6214,91.1142',
    facebookUrl: 'https://facebook.com',
    instagramUrl: 'https://instagram.com',
  },
  siteContent: DEFAULT_SITE_CONTENT,
  deliveryZones: [
    {
      id: 'sadar-bazar',
      name: 'সদর বাজার',
      fee: 40,
      eta: '৩০–৪০ মিনিট',
      note: 'মূল রান্নাঘর থেকে গরম হট-বক্সে সরাসরি ডেলিভারি।',
      subAreas: [
        { id: 'sadar-college-road', name: 'কলেজ রোড' },
        { id: 'sadar-upazila', name: 'উপজেলা চত্বর ও থানা রোড' },
        { id: 'sadar-bus-stand', name: 'বাসস্ট্যান্ড ও হাসপাতাল মোড়' },
      ],
      sortOrder: 1,
    },
    {
      id: 'sahebabad',
      name: 'সাহেবাবাদ',
      fee: 50,
      eta: '৩৫–৪৫ মিনিট',
      note: 'গরম ও সতেজ রাখতে বিশেষ ইনসুলেটেড প্যাকেজিং।',
      subAreas: [
        { id: 'sahebabad-bazar', name: 'সাহেবাবাদ বাজার' },
        { id: 'sahebabad-notun-para', name: 'নতুন পাড়া' },
        { id: 'sahebabad-dokkhin-para', name: 'দক্ষিণ পাড়া', fee: 55 },
      ],
      sortOrder: 2,
    },
    {
      id: 'madhobpur',
      name: 'মাধবপুর',
      fee: 60,
      eta: '৪০–৫৫ মিনিট',
      note: 'নিজস্ব রাইডার সার্ভিসের মাধ্যমে ডেলিভারি।',
      subAreas: [
        { id: 'madhobpur-bazar', name: 'মাধবপুর বাজার' },
        { id: 'madhobpur-masjid-road', name: 'বড় মসজিদ রোড' },
      ],
      sortOrder: 3,
    },
    {
      id: 'shashidal',
      name: 'শশীদল',
      fee: 70,
      eta: '৪৫–৬০ মিনিট',
      note: 'খাওয়ার অন্তত ৪৫ মিনিট আগে অর্ডার করলে ভালো হয়।',
      subAreas: [
        { id: 'shashidal-station', name: 'শশীদল স্টেশন বাজার' },
        { id: 'shashidal-railgate', name: 'রেলগেট সংলগ্ন এলাকা' },
      ],
      sortOrder: 4,
    },
    {
      id: 'mirpur',
      name: 'মিরপুর',
      fee: 80,
      eta: '৫০–৬৫ মিনিট',
      note: 'বর্ধিত ডেলিভারি এলাকা।',
      subAreas: [
        { id: 'mirpur-bazar', name: 'মিরপুর বাজার' },
        { id: 'mirpur-school-road', name: 'হাইস্কুল রোড' },
      ],
      sortOrder: 5,
    },
    {
      id: 'outside-zone',
      name: 'নির্ধারিত এলাকার বাইরে',
      fee: 0,
      eta: 'পিকআপ / প্রি-অর্ডার',
      isOutOfArea: true,
      note: 'এই এলাকায় তাৎক্ষণিক হোম ডেলিভারি নেই, তবে দোকান থেকে সরাসরি পিকআপ অথবা অনুষ্ঠানের জন্য প্রি-অর্ডার করতে পারবেন।',
      subAreas: [],
      sortOrder: 6,
    },
  ],
  menuItems: [
    {
      id: 'royal-mutton-kacchi-1-1',
      name: 'রাজকীয় বাসমতি মাটন কাচ্চি',
      category: 'স্পেশাল কাচ্চি ও তেহারি',
      description:
        'জাফরান, খাঁটি গাওয়া ঘি ও আস্ত মসলায় তামার হাঁড়িতে দম দেওয়া বাসমতি চাল, নরম খাসির মাংস ও সোনালি আলু।',
      servingSize: '১ জনের জন্য',
      price: 380,
      image: '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'shahi-handi-kacchi-1-5',
      name: 'নবাবী হাঁড়ি কাচ্চি ফ্যামিলি প্যাক',
      category: 'স্পেশাল কাচ্চি ও তেহারি',
      description:
        'পরিবার ও মেহমানদারির জন্য আটা দিয়ে মুখ বাঁধা মাটির হাঁড়িতে দম করা কাচ্চি, সাথে ৫টি সেদ্ধ ডিম ও আলুবোখারা।',
      servingSize: '৫ জনের ফ্যামিলি প্যাক',
      price: 1850,
      image: '/src/assets/images/hero_royal_dastarkhwan_1794979671876.jpg',
      available: true,
      preOrderOnly: true,
      advanceNotice: 'কমপক্ষে ৪ ঘণ্টা আগে অর্ডার করতে হবে',
    },
    {
      id: 'old-dhaka-beef-tehari',
      name: 'পুরান ঢাকার সরিষার তেলের গরুর তেহারি',
      category: 'স্পেশাল কাচ্চি ও তেহারি',
      description:
        'সুগন্ধি চিনিগুঁড়া চাল, খাঁটি দেশি সরিষার তেল, নরম গরুর মাংসের টুকরা ও কাঁচামরিচের ঝাঁঝালো স্বাদ।',
      servingSize: '১ জনের ফুল প্লেট',
      price: 290,
      image: '/src/assets/images/menu_beef_tehari_1794979672672.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'shahi-morog-polao',
      name: 'শাহী ঘি মোরগ পোলাও',
      category: 'স্পেশাল কাচ্চি ও তেহারি',
      description:
        'দই ও জায়ফল-এলাচের মৃদু গ্রেভিতে রান্না করা সোনালি মুরগির রোস্ট, সুগন্ধি পোলাও, পেঁয়াজ বেরেস্তা, কিসমিস ও কাজু বাদাম।',
      servingSize: '১ জনের জন্য',
      price: 310,
      image: '/src/assets/images/menu_morog_polao_1794979670687.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'whole-roast-khashi-raan',
      name: 'আস্ত খাসির রান রোস্ট ও জাফরানি পোলাও',
      category: 'স্পেশাল কাচ্চি ও তেহারি',
      description:
        '২৪ ঘণ্টা মসলায় ম্যারিনেট করা আস্ত খাসির রান রোস্ট, সাথে বাদাম-কিসমিস ছড়ানো জাফরানি পোলাও ও সেদ্ধ ডিমের রাজকীয় থালা।',
      servingSize: '৪ জনের দাওয়াত প্ল্যাটার',
      price: 2650,
      image: '/src/assets/images/menu_raan_feast_1794979674245.jpg',
      available: true,
      preOrderOnly: true,
      advanceNotice: 'কমপক্ষে ৬ ঘণ্টা আগে অর্ডার করতে হবে',
    },
    {
      id: 'jali-shami-kebab-duo',
      name: 'পুরান ঢাকার গরুর জালি ও শামি কাবাব',
      category: 'কাবাব ও স্টার্টার',
      description:
        'হাতে মিহি কিমা করা ঐতিহ্যবাহী গরুর জালি ও শামি কাবাব, সাথে সতেজ ধনেপাতা-পুদিনার চাটনি ও পেঁয়াজের রিং।',
      servingSize: '৪ পিস',
      price: 240,
      image: '/src/assets/images/menu_jali_kebab_1794979672863.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'charcoal-reshmi-boti-platter',
      name: 'কাঠ-কয়লার চিকেন রেশমি ও মাটন বটি প্ল্যাটার',
      category: 'কাবাব ও স্টার্টার',
      description:
        'কাজু-মালাই মাখানো রেশমি কাবাব ও ধোঁয়াটে স্বাদের মাটন বটি কাবাব, সাথে তন্দুরি গার্লিক নান।',
      servingSize: '২ জনের শেয়ার প্ল্যাটার',
      price: 540,
      image: '/src/assets/images/menu_sheekh_reshmi_1794979673797.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'matka-saffron-firni-tukra',
      name: 'মাটির ভাঁড়ে জাফরানি ফিরনি ও শাহী টুকরা',
      category: 'ডেজার্ট ও পানীয়',
      description:
        'ঘন দুধ ও গুঁড়া বাসমতি চালে তৈরি ঠান্ডা মাটির হাঁড়ির ফিরনি এবং খাঁটি ঘিয়ে ভাজা পেস্তা-বাদামের শাহী টুকরা।',
      servingSize: '২ জনের পরিবেশন',
      price: 220,
      image: '/src/assets/images/menu_shahi_tukra_1794979672637.jpg',
      available: true,
      preOrderOnly: false,
    },
    {
      id: 'spiced-mint-borhani-duo',
      name: 'ঐতিহ্যবাহী পুদিনা বোরহানি ও বাদাম শরবত',
      category: 'ডেজার্ট ও পানীয়',
      description:
        'টক দই, বিট লবণ, সাদা গোলমরিচ ও তাজা পুদিনায় তৈরি হজম সহায়ক ঝাঁঝালো বোরহানি ও জাফরানি পেস্তা-বাদাম শরবত।',
      servingSize: '২ গ্লাস (৫০০ মি.লি.)',
      price: 190,
      image: '/src/assets/images/menu_borhani_badam_1794979674421.jpg',
      available: true,
      preOrderOnly: false,
    },
  ],
  metaConfig: {
    enabled: false,
    pixelId: '',
    capiEnabled: false,
    capiAccessToken: '',
    capiEndpointUrl: '',
    testEventCode: '',
    debugConsole: false,
  },
};

export const SIGNATURE_HERITAGE: HeritageDish[] = DEFAULT_HERITAGE_DISHES;

export const CUSTOMER_REVIEWS: CustomerReview[] = DEFAULT_CUSTOMER_REVIEWS;
