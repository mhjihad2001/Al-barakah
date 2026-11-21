import { useRef, useState } from 'react';
import { Calendar, CheckCircle2, ExternalLink, Users } from 'lucide-react';
import {
  DEFAULT_SITE_CONTENT,
  type RestaurantInfo,
  type SiteContent,
} from '../data/restaurantConfig';
import {
  buildWhatsAppCateringUrl,
  toBengaliDigits,
  validateCateringForm,
} from '../utils/orderLogic';

interface CateringSectionProps {
  restaurantInfo: RestaurantInfo;
  cateringContent?: SiteContent['catering'];
}

const EVENT_TYPES = [
  'পারিবারিক দাওয়াত / ডিনার',
  'বিয়ে / গায়ে হলুদ অনুষ্ঠান',
  'অফিস বা কর্পোরেট লাঞ্চ',
  'কাস্টম বাল্ক হাঁড়ি অর্ডার',
];

export function CateringSection({
  restaurantInfo,
  cateringContent = DEFAULT_SITE_CONTENT.catering,
}: CateringSectionProps) {
  const todayIso = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [guests, setGuests] = useState('25');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);
  const waAnchorRef = useRef<HTMLAnchorElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, phone, eventDate, guests, eventType, notes };
    const result = validateCateringForm(payload);

    if (!result.isValid) {
      setErrors(result.errors);
      setSubmittedUrl(null);
      return;
    }

    setErrors({});
    const url = buildWhatsAppCateringUrl(
      restaurantInfo.whatsappNumber,
      payload,
      restaurantInfo.brandName
    );
    setSubmittedUrl(url);

    if (waAnchorRef.current) {
      waAnchorRef.current.href = url;
      waAnchorRef.current.click();
    }
  };

  return (
    <section id="catering" className="bg-[#111815] py-16 text-[#FAF6F0] sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          {/* Left Banner Copy */}
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[#C5A059]">
              {cateringContent.eyebrow}
            </p>
            <h2
              className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#FAF6F0] sm:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              {cateringContent.heading}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#FAF6F0]/80 sm:text-base">
              {cateringContent.description}
            </p>

            <div className="mt-8 space-y-4 border-t border-white/10 pt-6 text-sm text-[#FAF6F0]/85">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-[#FAF6F0]">
                    {cateringContent.highlight1Title}
                  </span>
                  <p className="mt-0.5 text-xs text-[#FAF6F0]/70">
                    {cateringContent.highlight1Text}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#C5A059]" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-[#FAF6F0]">
                    {cateringContent.highlight2Title}
                  </span>
                  <p className="mt-0.5 text-xs text-[#FAF6F0]/70">
                    {cateringContent.highlight2Text}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Custom Order Form */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-[#C5A059]/30 bg-[#18221D] p-6 sm:p-8">
              <h3 className="font-serif text-2xl font-semibold text-[#FAF6F0]">
                {cateringContent.formTitle}
              </h3>
              <p className="mt-1.5 text-xs text-[#FAF6F0]/70">
                {cateringContent.formSubtitle}
              </p>

              <a
                ref={waAnchorRef}
                href="#catering"
                target="_blank"
                rel="noopener noreferrer"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              >
                হোয়াটসঅ্যাপে ক্যাটারিং বার্তা পাঠান
              </a>

              {submittedUrl ? (
                <div
                  data-testid="catering-confirmation"
                  className="mt-6 rounded-lg border border-[#C5A059]/45 bg-[#111815] p-6"
                >
                  <div className="flex items-center gap-2.5 text-[#C5A059]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <h4 className="font-serif text-lg font-semibold text-[#FAF6F0]">
                      আপনার কাস্টম অর্ডার অনুরোধ প্রস্তুত
                    </h4>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#FAF6F0]/80">
                    ধন্যবাদ, <strong>{name}</strong>।{' '}
                    <span className="tabular-nums font-semibold">
                      {toBengaliDigits(eventDate)}
                    </span>{' '}
                    তারিখে{' '}
                    <span className="tabular-nums font-semibold">
                      {toBengaliDigits(guests)}
                    </span>{' '}
                    জন অতিথির জন্য আপনার বার্তা তৈরি হয়েছে।
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <a
                      href={submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-[#C5A059] px-5 py-2.5 text-sm font-semibold text-[#111815] hover:bg-[#D4B26E]"
                    >
                      <span>হোয়াটসঅ্যাপে পাঠান</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmittedUrl(null)}
                      className="inline-flex min-h-[44px] items-center rounded-md border border-white/20 px-4 py-2 text-xs font-medium text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
                    >
                      তথ্য পরিবর্তন করুন
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="catering-name"
                        className="block text-xs font-medium text-[#FAF6F0]/85"
                      >
                        আপনার নাম
                      </label>
                      <input
                        id="catering-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="যেমন: কামরুল হাসান"
                        className="mt-1.5 block w-full min-h-[44px] rounded-md border border-white/15 bg-[#111815] px-3.5 py-2 text-sm text-[#FAF6F0] placeholder:text-[#FAF6F0]/35 focus:border-[#C5A059] focus:outline-none"
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-[#F2B8A2]">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="catering-phone"
                        className="block text-xs font-medium text-[#FAF6F0]/85"
                      >
                        মোবাইল নম্বর
                      </label>
                      <input
                        id="catering-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="যেমন: 01711-000000"
                        className="mt-1.5 block w-full min-h-[44px] rounded-md border border-white/15 bg-[#111815] px-3.5 py-2 text-sm text-[#FAF6F0] placeholder:text-[#FAF6F0]/35 focus:border-[#C5A059] focus:outline-none"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-[#F2B8A2]">{errors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label
                        htmlFor="catering-event-type"
                        className="block text-xs font-medium text-[#FAF6F0]/85"
                      >
                        অনুষ্ঠানের ধরন
                      </label>
                      <select
                        id="catering-event-type"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="mt-1.5 block w-full min-h-[44px] rounded-md border border-white/15 bg-[#111815] px-3 py-2 text-sm text-[#FAF6F0] focus:border-[#C5A059] focus:outline-none"
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="catering-date"
                        className="block text-xs font-medium text-[#FAF6F0]/85"
                      >
                        অনুষ্ঠানের তারিখ
                      </label>
                      <input
                        id="catering-date"
                        type="date"
                        min={todayIso}
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="mt-1.5 block w-full min-h-[44px] rounded-md border border-white/15 bg-[#111815] px-3 py-2 text-sm text-[#FAF6F0] focus:border-[#C5A059] focus:outline-none"
                      />
                      {errors.eventDate && (
                        <p className="mt-1 text-xs text-[#F2B8A2]">{errors.eventDate}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="catering-guests"
                        className="block text-xs font-medium text-[#FAF6F0]/85"
                      >
                        অতিথি সংখ্যা
                      </label>
                      <input
                        id="catering-guests"
                        type="number"
                        min={10}
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="mt-1.5 block w-full min-h-[44px] rounded-md border border-white/15 bg-[#111815] px-3 py-2 text-sm text-[#FAF6F0] tabular-nums focus:border-[#C5A059] focus:outline-none"
                      />
                      {errors.guests && (
                        <p className="mt-1 text-xs text-[#F2B8A2]">{errors.guests}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="catering-notes"
                      className="block text-xs font-medium text-[#FAF6F0]/85"
                    >
                      খাবারের তালিকা, ঝালের পছন্দ ও ডেলিভারি বিবরণ
                    </label>
                    <textarea
                      id="catering-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="যেমন: ২টি ফ্যামিলি কাচ্চি হাঁড়ি, ৩০টি জালি কাবাব, বয়স্কদের জন্য হালকা ঝাল, সাহেবাবাদে দুপুর ১টার মধ্যে ডেলিভারি।"
                      className="mt-1.5 block w-full rounded-md border border-white/15 bg-[#111815] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder:text-[#FAF6F0]/35 focus:border-[#C5A059] focus:outline-none"
                    />
                    {errors.notes && (
                      <p className="mt-1 text-xs text-[#F2B8A2]">{errors.notes}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-[#C5A059] px-6 py-3 text-sm font-semibold text-[#111815] transition-colors hover:bg-[#D4B26E] sm:w-auto cursor-pointer"
                    >
                      <span>{cateringContent.submitButtonLabel}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
