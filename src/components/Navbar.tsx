import { useEffect, useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';
import { toBengaliDigits } from '../utils/orderLogic';

interface NavbarProps {
  restaurantInfo: RestaurantInfo;
  siteContent?: SiteContent['navbar'];
  cartItemCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
}

export function Navbar({
  restaurantInfo,
  siteContent = DEFAULT_SITE_CONTENT.navbar,
  cartItemCount,
  onOpenCart,
  onOpenTracking,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const navLinks = [
    { label: siteContent.heritageLabel, href: '#heritage' },
    { label: siteContent.menuLabel, href: '#menu' },
    { label: siteContent.cateringLabel, href: '#catering' },
    { label: siteContent.contactLabel, href: '#contact' },
  ];

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [restaurantInfo.logoUrl]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        isScrolled || mobileMenuOpen
          ? 'bg-[#111815]/95 backdrop-blur-md border-b border-[#C5A059]/20'
          : 'bg-[#111815]/75 backdrop-blur-sm border-b border-white/10'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 md:gap-8 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark (with optional Admin Logo) */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 font-serif text-base font-semibold tracking-tight text-[#FAF6F0] whitespace-nowrap shrink-0 sm:text-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A059]"
        >
          {restaurantInfo.logoUrl.trim() && !logoError && (
            <img
              src={restaurantInfo.logoUrl.trim()}
              alt={restaurantInfo.brandName}
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="h-7 w-7 rounded object-cover border border-[#C5A059]/40"
            />
          )}
          <span className="truncate max-w-[205px] sm:max-w-none">
            {restaurantInfo.brandName}
          </span>
        </a>

        {/* Zone 2: Desktop single-line Bengali navigation links */}
        <nav
          aria-label="প্রধান নেভিগেশন"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#FAF6F0]/85"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C5A059] hover:text-[#C5A059] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A059]"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenTracking}
            data-testid="nav-track-order-button"
            className="whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C5A059] hover:text-[#C5A059] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C5A059]"
          >
            {siteContent.trackLabel}
          </button>
        </nav>

        {/* Zone 3: Primary Cart CTA + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 shrink-0 sm:gap-3">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`অর্ডার ব্যাগ খুলুন, ${toBengaliDigits(cartItemCount)}টি খাবার`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-[#C5A059] px-3 py-2 text-xs font-semibold text-[#111815] transition-colors hover:bg-[#D4B26E] whitespace-nowrap shrink-0 cursor-pointer sm:gap-2 sm:px-4 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF6F0]"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>{siteContent.cartLabel}</span>
            <span className="tabular-nums font-bold">
              ({toBengaliDigits(cartItemCount)})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'নেভিগেশন মেনু খুলুন'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md border border-[#C5A059]/30 text-[#FAF6F0] md:hidden hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Links */}
      {mobileMenuOpen && (
        <nav
          aria-label="মোবাইল নেভিগেশন"
          className="border-t border-[#C5A059]/20 bg-[#111815] px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-2 text-base font-medium text-[#FAF6F0]/90 hover:text-[#C5A059] border-b border-white/5"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTracking();
              }}
              className="min-h-[44px] flex items-center px-2 text-left text-base font-medium text-[#C5A059] cursor-pointer"
            >
              {siteContent.trackLabel}
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
