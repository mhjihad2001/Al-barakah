import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  type CustomerReview,
  type HeritageDish,
  type MenuItem,
  type SiteContent,
} from '../data/restaurantConfig';

interface AdminPageCopyEditorProps {
  siteContent: SiteContent;
  menuItems: MenuItem[];
  onChange: (next: SiteContent) => void;
}

type CopySectionId = 'nav-hero' | 'heritage' | 'menu-catering' | 'reviews' | 'footer';

const COPY_SECTIONS: Array<{ id: CopySectionId; label: string }> = [
  { id: 'nav-hero', label: 'নেভবার ও হিরো' },
  { id: 'heritage', label: 'স্পেশাল পদ' },
  { id: 'menu-catering', label: 'মেনু ও ক্যাটারিং' },
  { id: 'reviews', label: 'গ্রাহকদের রিভিউ' },
  { id: 'footer', label: 'ফুটার ও ম্যাপ' },
];

const INPUT_CLASS =
  'mt-1.5 block w-full min-h-[40px] rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none';
const TEXTAREA_CLASS =
  'mt-1.5 block w-full rounded-md border border-[#111815]/20 bg-white px-3 py-2 text-sm text-[#111815] focus:border-[#C5A059] focus:outline-none';
const LABEL_CLASS = 'block text-xs font-semibold text-[#111815]';

export function AdminPageCopyEditor({
  siteContent,
  menuItems,
  onChange,
}: AdminPageCopyEditorProps) {
  const [section, setSection] = useState<CopySectionId>('nav-hero');

  const updateNavbar = <K extends keyof SiteContent['navbar']>(
    key: K,
    value: SiteContent['navbar'][K]
  ) => {
    onChange({
      ...siteContent,
      navbar: {
        ...siteContent.navbar,
        [key]: value,
      },
    });
  };

  const updateHero = <K extends keyof SiteContent['hero']>(
    key: K,
    value: SiteContent['hero'][K]
  ) => {
    onChange({
      ...siteContent,
      hero: {
        ...siteContent.hero,
        [key]: value,
      },
    });
  };

  const updateHeritage = <K extends keyof SiteContent['heritage']>(
    key: K,
    value: SiteContent['heritage'][K]
  ) => {
    onChange({
      ...siteContent,
      heritage: {
        ...siteContent.heritage,
        [key]: value,
      },
    });
  };

  const updateHeritageDish = (id: string, patch: Partial<HeritageDish>) => {
    updateHeritage(
      'dishes',
      siteContent.heritage.dishes.map((dish) =>
        dish.id === id ? { ...dish, ...patch } : dish
      )
    );
  };

  const handleAddHeritageDish = () => {
    const nextIdx = siteContent.heritage.dishes.length + 1;
    const defaultMenu = menuItems[0];
    const newDish: HeritageDish = {
      id: `sig-${Date.now()}`,
      number: `০${nextIdx}`,
      title: 'নতুন স্পেশাল পদ',
      subtitle: 'ঐতিহ্যবাহী মসলা ও খাঁটি স্বাদ',
      story: 'আমাদের বাবুর্চির বিশেষ যত্নে রান্না করা ঐতিহ্যবাহী খাবার।',
      pairing: 'সাথে মানায়: ঐতিহ্যবাহী পুদিনা বোরহানি',
      price: defaultMenu?.price ?? 350,
      servingSize: defaultMenu?.servingSize ?? '১ জনের জন্য',
      image:
        defaultMenu?.image ?? '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg',
      menuItemId: defaultMenu?.id ?? '',
    };
    updateHeritage('dishes', [...siteContent.heritage.dishes, newDish]);
  };

  const handleDeleteHeritageDish = (id: string) => {
    updateHeritage(
      'dishes',
      siteContent.heritage.dishes.filter((dish) => dish.id !== id)
    );
  };

  const updateMenuCopy = <K extends keyof SiteContent['menu']>(
    key: K,
    value: SiteContent['menu'][K]
  ) => {
    onChange({
      ...siteContent,
      menu: {
        ...siteContent.menu,
        [key]: value,
      },
    });
  };

  const updateCatering = <K extends keyof SiteContent['catering']>(
    key: K,
    value: SiteContent['catering'][K]
  ) => {
    onChange({
      ...siteContent,
      catering: {
        ...siteContent.catering,
        [key]: value,
      },
    });
  };

  const updateReviews = <K extends keyof SiteContent['reviews']>(
    key: K,
    value: SiteContent['reviews'][K]
  ) => {
    onChange({
      ...siteContent,
      reviews: {
        ...siteContent.reviews,
        [key]: value,
      },
    });
  };

  const updateReviewItem = (id: string, patch: Partial<CustomerReview>) => {
    updateReviews(
      'items',
      siteContent.reviews.items.map((rev) =>
        rev.id === id ? { ...rev, ...patch } : rev
      )
    );
  };

  const handleAddReview = () => {
    const newReview: CustomerReview = {
      id: `rev-${Date.now()}`,
      author: 'নতুন গ্রাহক',
      location: 'সদর বাজার',
      rating: 5,
      dishOrdered: menuItems[0]?.name ?? 'রাজকীয় বাসমতি মাটন কাচ্চি',
      dateLabel: 'সম্প্রতি',
      quote: 'খাবারের স্বাদ ও ডেলিভারি দুটোই অসাধারণ ছিল।',
    };
    updateReviews('items', [newReview, ...siteContent.reviews.items]);
  };

  const handleDeleteReview = (id: string) => {
    updateReviews(
      'items',
      siteContent.reviews.items.filter((rev) => rev.id !== id)
    );
  };

  const updateFooter = <K extends keyof SiteContent['footer']>(
    key: K,
    value: SiteContent['footer'][K]
  ) => {
    onChange({
      ...siteContent,
      footer: {
        ...siteContent.footer,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4">
        <div>
          <h3 className="font-serif text-base font-semibold text-[#111815]">
            পেজের সকল লেখা এডিট করুন
          </h3>
          <p className="mt-0.5 text-xs text-[#525B56]">
            নেভবার, হিরো, স্পেশাল পদ, মেনু, ক্যাটারিং, গ্রাহকদের রিভিউ ও ফুটারের প্রতিটি লেখা পরিবর্তন করলে সাথে সাথে মূল পেজে আপডেট হবে।
          </p>
        </div>
      </div>

      {/* Sub-Section Switcher */}
      <div
        role="tablist"
        aria-label="পেজের সেকশন নির্বাচন"
        className="flex flex-wrap gap-1.5 border-b border-[#111815]/12 pb-3"
      >
        {COPY_SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(item.id)}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#111815] text-[#C5A059]'
                  : 'border border-[#111815]/15 bg-white text-[#525B56] hover:text-[#111815]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 1. Navbar & Hero */}
      {section === 'nav-hero' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              উপরের মেনুবার (Navbar) লেখা
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLASS}>স্পেশাল পদ লিংক</label>
                <input
                  type="text"
                  value={siteContent.navbar.heritageLabel}
                  onChange={(e) => updateNavbar('heritageLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>মেনু লিংক</label>
                <input
                  type="text"
                  value={siteContent.navbar.menuLabel}
                  onChange={(e) => updateNavbar('menuLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>প্রি-অর্ডার লিংক</label>
                <input
                  type="text"
                  value={siteContent.navbar.cateringLabel}
                  onChange={(e) => updateNavbar('cateringLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>যোগাযোগ লিংক</label>
                <input
                  type="text"
                  value={siteContent.navbar.contactLabel}
                  onChange={(e) => updateNavbar('contactLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>অর্ডার ট্র্যাক বাটন</label>
                <input
                  type="text"
                  value={siteContent.navbar.trackLabel}
                  onChange={(e) => updateNavbar('trackLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>কার্ট / ব্যাগ বাটন</label>
                <input
                  type="text"
                  value={siteContent.navbar.cartLabel}
                  onChange={(e) => updateNavbar('cartLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              হিরো ব্যানার ও প্রধান শিরোনাম
            </h4>
            <div>
              <label htmlFor="edit-hero-headline" className={LABEL_CLASS}>
                প্রধান শিরোনাম (Hero Headline)
              </label>
              <input
                id="edit-hero-headline"
                type="text"
                value={siteContent.hero.headline}
                onChange={(e) => updateHero('headline', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="edit-hero-desc" className={LABEL_CLASS}>
                হিরো সংক্ষিপ্ত বিবরণ
              </label>
              <textarea
                id="edit-hero-desc"
                rows={3}
                value={siteContent.hero.description}
                onChange={(e) => updateHero('description', e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>হিরো ব্যাকগ্রাউন্ড ছবির পাথ / URL</label>
              <input
                type="text"
                value={siteContent.hero.heroImageUrl}
                onChange={(e) => updateHero('heroImageUrl', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLASS}>প্রধান বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.hero.primaryCtaLabel}
                  onChange={(e) => updateHero('primaryCtaLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>দ্বিতীয় বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.hero.secondaryCtaLabel}
                  onChange={(e) => updateHero('secondaryCtaLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>ট্র্যাকিং বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.hero.trackCtaLabel}
                  onChange={(e) => updateHero('trackCtaLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>ডেলিভারি জোন চেকার শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.hero.zoneCheckerTitle}
                  onChange={(e) => updateHero('zoneCheckerTitle', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>এলাকা ড্রপডাউন লেবেল</label>
                <input
                  type="text"
                  value={siteContent.hero.zoneSelectLabel}
                  onChange={(e) => updateHero('zoneSelectLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              লাইভ স্ট্যাটাস ব্যাজ ও বার্তা
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>খোলা অবস্থার ব্যাজ লেখা</label>
                <input
                  type="text"
                  value={siteContent.hero.statusOpenBadge}
                  onChange={(e) => updateHero('statusOpenBadge', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>প্রি-অর্ডার অবস্থার ব্যাজ লেখা</label>
                <input
                  type="text"
                  value={siteContent.hero.statusPreorderBadge}
                  onChange={(e) => updateHero('statusPreorderBadge', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>খোলা অবস্থার বিস্তারিত বার্তা</label>
              <input
                type="text"
                value={siteContent.hero.statusOpenDetail}
                onChange={(e) => updateHero('statusOpenDetail', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>ম্যানুয়াল প্রি-অর্ডার মোডের বার্তা</label>
              <input
                type="text"
                value={siteContent.hero.statusPreorderDetail}
                onChange={(e) => updateHero('statusPreorderDetail', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>সময়সীমার বাইরে বন্ধ থাকাকালীন বার্তা</label>
              <input
                type="text"
                value={siteContent.hero.statusClosedDetail}
                onChange={(e) => updateHero('statusClosedDetail', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Signature Heritage Section */}
      {section === 'heritage' && (
        <div className="space-y-5">
          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-3">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              স্পেশাল পদ সেকশন শিরোনাম
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>উপরের ছোট লেখা (Eyebrow)</label>
                <input
                  type="text"
                  value={siteContent.heritage.eyebrow}
                  onChange={(e) => updateHeritage('eyebrow', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>মূল শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.heritage.heading}
                  onChange={(e) => updateHeritage('heading', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>সংক্ষিপ্ত পরিচিতি</label>
              <textarea
                rows={2}
                value={siteContent.heritage.subheading}
                onChange={(e) => updateHeritage('subheading', e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-semibold text-[#111815]">
              ফিচার্ড স্পেশাল পদসমূহ ({siteContent.heritage.dishes.length} টি)
            </h4>
            <button
              type="button"
              onClick={handleAddHeritageDish}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-[#111815] px-3 py-1.5 text-xs font-semibold text-[#C5A059] hover:bg-[#1E2B25] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>নতুন স্পেশাল পদ যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {siteContent.heritage.dishes.map((dish) => (
              <div
                key={dish.id}
                className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#111815]/10 pb-2">
                  <span className="font-serif text-sm font-semibold text-[#111815]">
                    {dish.number} · {dish.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteHeritageDish(dish.id)}
                    aria-label={`${dish.title} মুছুন`}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>মুছুন</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className={LABEL_CLASS}>ক্রমিক নম্বর</label>
                    <input
                      type="text"
                      value={dish.number}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { number: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>পদের শিরোনাম</label>
                    <input
                      type="text"
                      value={dish.title}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { title: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>দাম (৳)</label>
                    <input
                      type="number"
                      value={dish.price}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, {
                          price: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={`${INPUT_CLASS} tabular-nums`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>উপ-শিরোনাম (Subtitle)</label>
                    <input
                      type="text"
                      value={dish.subtitle}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { subtitle: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>পরিবেশনের পরিমাণ</label>
                    <input
                      type="text"
                      value={dish.servingSize}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { servingSize: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>পদের গল্প / বিস্তারিত বিবরণ</label>
                  <textarea
                    rows={2}
                    value={dish.story}
                    onChange={(e) =>
                      updateHeritageDish(dish.id, { story: e.target.value })
                    }
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={LABEL_CLASS}>পেয়ারিং / বিশেষ নোট</label>
                    <input
                      type="text"
                      value={dish.pairing}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { pairing: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>ছবির পাথ / URL</label>
                    <input
                      type="text"
                      value={dish.image}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { image: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>যুক্ত মেনু আইটেম (অর্ডার বাটনের জন্য)</label>
                    <select
                      value={dish.menuItemId}
                      onChange={(e) =>
                        updateHeritageDish(dish.id, { menuItemId: e.target.value })
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">মেনু নির্বাচন করুন</option>
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Menu & Catering Copy */}
      {section === 'menu-catering' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              মেনু সেকশনের শিরোনাম ও বাটন লেখা
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>ছোট শিরোনাম (Eyebrow)</label>
                <input
                  type="text"
                  value={siteContent.menu.eyebrow}
                  onChange={(e) => updateMenuCopy('eyebrow', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>মেনু মূল শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.menu.heading}
                  onChange={(e) => updateMenuCopy('heading', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>প্রি-অর্ডার ফিল্টার বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.menu.preOrderFilterLabel}
                  onChange={(e) =>
                    updateMenuCopy('preOrderFilterLabel', e.target.value)
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>অর্ডার বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.menu.orderButtonLabel}
                  onChange={(e) => updateMenuCopy('orderButtonLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>স্টক শেষ ব্যাজ লেখা</label>
                <input
                  type="text"
                  value={siteContent.menu.outOfStockLabel}
                  onChange={(e) => updateMenuCopy('outOfStockLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              বড় দাওয়াত ও ক্যাটারিং সেকশন
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>ছোট শিরোনাম (Eyebrow)</label>
                <input
                  type="text"
                  value={siteContent.catering.eyebrow}
                  onChange={(e) => updateCatering('eyebrow', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>মূল শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.catering.heading}
                  onChange={(e) => updateCatering('heading', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>বিবরণ</label>
              <textarea
                rows={3}
                value={siteContent.catering.description}
                onChange={(e) => updateCatering('description', e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-md border border-[#111815]/10 bg-[#FAF6F0]/60 p-3">
                <label className={LABEL_CLASS}>বিশেষ তথ্য কার্ড ১ — শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.catering.highlight1Title}
                  onChange={(e) => updateCatering('highlight1Title', e.target.value)}
                  className={INPUT_CLASS}
                />
                <label className={LABEL_CLASS}>বিশেষ তথ্য কার্ড ১ — বিবরণ</label>
                <textarea
                  rows={2}
                  value={siteContent.catering.highlight1Text}
                  onChange={(e) => updateCatering('highlight1Text', e.target.value)}
                  className={TEXTAREA_CLASS}
                />
              </div>
              <div className="space-y-2 rounded-md border border-[#111815]/10 bg-[#FAF6F0]/60 p-3">
                <label className={LABEL_CLASS}>বিশেষ তথ্য কার্ড ২ — শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.catering.highlight2Title}
                  onChange={(e) => updateCatering('highlight2Title', e.target.value)}
                  className={INPUT_CLASS}
                />
                <label className={LABEL_CLASS}>বিশেষ তথ্য কার্ড ২ — বিবরণ</label>
                <textarea
                  rows={2}
                  value={siteContent.catering.highlight2Text}
                  onChange={(e) => updateCatering('highlight2Text', e.target.value)}
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL_CLASS}>ফর্ম শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.catering.formTitle}
                  onChange={(e) => updateCatering('formTitle', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>ফর্ম উপ-শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.catering.formSubtitle}
                  onChange={(e) => updateCatering('formSubtitle', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>সাবমিট বাটন লেখা</label>
                <input
                  type="text"
                  value={siteContent.catering.submitButtonLabel}
                  onChange={(e) =>
                    updateCatering('submitButtonLabel', e.target.value)
                  }
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Customer Reviews */}
      {section === 'reviews' && (
        <div className="space-y-5">
          <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-3">
            <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
              রিভিউ সেকশন শিরোনাম ও রেটিং ব্যাজ
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLASS}>ছোট শিরোনাম (Eyebrow)</label>
                <input
                  type="text"
                  value={siteContent.reviews.eyebrow}
                  onChange={(e) => updateReviews('eyebrow', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>মূল শিরোনাম</label>
                <input
                  type="text"
                  value={siteContent.reviews.heading}
                  onChange={(e) => updateReviews('heading', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>রেটিং স্কোর লেখা</label>
                <input
                  type="text"
                  value={siteContent.reviews.ratingBadgeText}
                  onChange={(e) => updateReviews('ratingBadgeText', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>যাচাইকৃত ক্রেতা লেবেল</label>
                <input
                  type="text"
                  value={siteContent.reviews.verifiedLabel}
                  onChange={(e) => updateReviews('verifiedLabel', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-serif text-sm font-semibold text-[#111815]">
              গ্রাহকদের রিভিউ তালিকা ({siteContent.reviews.items.length} টি)
            </h4>
            <button
              type="button"
              onClick={handleAddReview}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-[#111815] px-3 py-1.5 text-xs font-semibold text-[#C5A059] hover:bg-[#1E2B25] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>নতুন রিভিউ যোগ করুন</span>
            </button>
          </div>

          <div className="space-y-4">
            {siteContent.reviews.items.map((rev, index) => (
              <div
                key={rev.id}
                className="rounded-lg border border-[#111815]/15 bg-[#FFFDF9] p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#111815]/10 pb-2">
                  <span className="font-serif text-sm font-semibold text-[#111815]">
                    রিভিউ #{index + 1} — {rev.author}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteReview(rev.id)}
                    aria-label={`${rev.author} রিভিউ মুছুন`}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>মুছুন</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={LABEL_CLASS}>গ্রাহকের নাম</label>
                    <input
                      type="text"
                      value={rev.author}
                      onChange={(e) =>
                        updateReviewItem(rev.id, { author: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>এলাকা</label>
                    <input
                      type="text"
                      value={rev.location}
                      onChange={(e) =>
                        updateReviewItem(rev.id, { location: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>রেটিং (১ থেকে ৫)</label>
                    <select
                      value={rev.rating}
                      onChange={(e) =>
                        updateReviewItem(rev.id, {
                          rating: Math.min(5, Math.max(1, Number(e.target.value) || 5)),
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      <option value={5}>৫ স্টার</option>
                      <option value={4}>৪ স্টার</option>
                      <option value={3}>৩ স্টার</option>
                      <option value={2}>২ স্টার</option>
                      <option value={1}>১ স্টার</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL_CLASS}>অর্ডার করা খাবার</label>
                    <input
                      type="text"
                      value={rev.dishOrdered}
                      onChange={(e) =>
                        updateReviewItem(rev.id, { dishOrdered: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>সময়কাল (যেমন: ২ সপ্তাহ আগে)</label>
                    <input
                      type="text"
                      value={rev.dateLabel}
                      onChange={(e) =>
                        updateReviewItem(rev.id, { dateLabel: e.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>গ্রাহকের মন্তব্য</label>
                  <textarea
                    rows={2}
                    value={rev.quote}
                    onChange={(e) =>
                      updateReviewItem(rev.id, { quote: e.target.value })
                    }
                    className={TEXTAREA_CLASS}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Footer & Map Card */}
      {section === 'footer' && (
        <div className="rounded-lg border border-[#111815]/12 bg-[#FFFDF9] p-4 space-y-4">
          <h4 className="font-serif text-sm font-semibold text-[#111815] border-b border-[#111815]/10 pb-2">
            ফুটার ও লোকেশন ম্যাপ কার্ড লেখা
          </h4>
          <div>
            <label htmlFor="edit-footer-about" className={LABEL_CLASS}>
              ফুটারে রেস্তোরাঁর সংক্ষিপ্ত পরিচিতি
            </label>
            <textarea
              id="edit-footer-about"
              rows={2}
              value={siteContent.footer.aboutDescription}
              onChange={(e) => updateFooter('aboutDescription', e.target.value)}
              className={TEXTAREA_CLASS}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>দ্রুত লিংক শিরোনাম</label>
              <input
                type="text"
                value={siteContent.footer.quickLinksHeading}
                onChange={(e) => updateFooter('quickLinksHeading', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>সোশ্যাল মিডিয়া শিরোনাম</label>
              <input
                type="text"
                value={siteContent.footer.socialHeading}
                onChange={(e) => updateFooter('socialHeading', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>ম্যাপ কার্ড উপরের লেবেল</label>
              <input
                type="text"
                value={siteContent.footer.mapHeaderLabel}
                onChange={(e) => updateFooter('mapHeaderLabel', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>ম্যাপ কার্ড লোকেশন নোট</label>
              <input
                type="text"
                value={siteContent.footer.mapLocationNote}
                onChange={(e) => updateFooter('mapLocationNote', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>ম্যাপ কার্ড নিচের লেবেল</label>
              <input
                type="text"
                value={siteContent.footer.mapFooterLabel}
                onChange={(e) => updateFooter('mapFooterLabel', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>ম্যাপ বাটন লেখা</label>
              <input
                type="text"
                value={siteContent.footer.mapButtonLabel}
                onChange={(e) => updateFooter('mapButtonLabel', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>কপিরাইট লেখা</label>
              <input
                type="text"
                value={siteContent.footer.copyrightText}
                onChange={(e) => updateFooter('copyrightText', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>নিচের ডানপাশের নোট</label>
              <input
                type="text"
                value={siteContent.footer.bottomNote}
                onChange={(e) => updateFooter('bottomNote', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
