import { useEffect, useId, useRef, useState } from 'react';
import {
  Check,
  Images,
  Link2,
  Loader2,
  RotateCcw,
  Upload,
  UtensilsCrossed,
} from 'lucide-react';
import {
  MENU_PRESET_IMAGES,
  uploadMenuImage,
} from '../utils/imageUpload';
import { toBengaliDigits } from '../utils/orderLogic';

interface MenuImagePickerProps {
  value: string;
  onChange: (nextImage: string) => void;
  itemHint?: string;
  label?: string;
  compact?: boolean;
  onStatusMessage?: (msg: string) => void;
  testIdPrefix?: string;
}

export function MenuImagePicker({
  value,
  onChange,
  itemHint = 'dish',
  label = 'খাবারের ছবি',
  compact = false,
  onStatusMessage,
  testIdPrefix = 'menu-image',
}: MenuImagePickerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<string | null>(null);

  useEffect(() => {
    setPreviewError(false);
  }, [value]);

  const isInlineDataUrl = value.startsWith('data:image/');

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setUploadMeta(null);
    setIsUploading(true);
    try {
      const result = await uploadMenuImage(file, itemHint);
      onChange(result.url);
      const metaText =
        result.storageMode === 'firebase-storage'
          ? `ক্লাউডে আপলোড হয়েছে (${toBengaliDigits(result.sizeKB)} KB)`
          : `ছবি অপ্টিমাইজ করে যুক্ত হয়েছে (${toBengaliDigits(result.sizeKB)} KB)`;
      setUploadMeta(metaText);
      onStatusMessage?.(metaText);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'ছবিটি আপলোড করা যায়নি, আবার চেষ্টা করুন।';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-[11px] font-semibold text-[#525B56]"
        >
          {label}
        </label>
        {uploadMeta && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
            <Check className="h-3 w-3" aria-hidden="true" />
            {uploadMeta}
          </span>
        )}
      </div>

      {/* Main Preview + Action Row (supports drag & drop) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center ${
          isDragging
            ? 'border-[#C5A059] bg-[#C5A059]/10'
            : 'border-[#111815]/15 bg-[#FAF6F0]/70'
        }`}
      >
        {/* Live Dish Thumbnail */}
        <div
          className={`relative shrink-0 overflow-hidden rounded-md border border-[#111815]/15 bg-[#18221D] ${
            compact ? 'h-20 w-28' : 'h-24 w-36'
          }`}
        >
          {value && !previewError ? (
            <img
              src={value}
              alt="খাবারের ছবির প্রিভিউ"
              referrerPolicy="no-referrer"
              onError={() => setPreviewError(true)}
              data-testid={`${testIdPrefix}-preview`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-[#C5A059]">
              <UtensilsCrossed className="h-5 w-5 opacity-80" aria-hidden="true" />
              <span className="mt-1 text-[10px] text-[#FAF6F0]/80">ছবি নেই</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111815]/75 text-[#FAF6F0]">
              <Loader2 className="h-5 w-5 animate-spin text-[#C5A059]" aria-hidden="true" />
              <span className="mt-1 text-[10px] font-medium">প্রসেস হচ্ছে...</span>
            </div>
          )}
        </div>

        {/* Easy Action Controls */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              data-testid={`${testIdPrefix}-file-input`}
              className="sr-only"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              data-testid={`${testIdPrefix}-upload-btn`}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-[#111815] px-3 py-1.5 text-xs font-semibold text-[#C5A059] hover:bg-[#1F2C26] disabled:opacity-60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ফোন / কম্পিউটার থেকে ছবি নিন</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGallery((prev) => !prev)}
              data-testid={`${testIdPrefix}-gallery-btn`}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                showGallery
                  ? 'border-[#111815] bg-[#111815] text-[#FAF6F0]'
                  : 'border-[#111815]/20 bg-white text-[#111815] hover:bg-[#EFE8DA]'
              }`}
            >
              <Images className="h-3.5 w-3.5" aria-hidden="true" />
              <span>রেডিমেড ছবি বাছাই</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlInput((prev) => !prev)}
              data-testid={`${testIdPrefix}-url-toggle-btn`}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                showUrlInput
                  ? 'border-[#111815] bg-[#EFE8DA] text-[#111815]'
                  : 'border-[#111815]/15 bg-white text-[#525B56] hover:bg-[#EFE8DA]'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>লিংক দিন</span>
            </button>

            {isInlineDataUrl && (
              <button
                type="button"
                onClick={() => {
                  onChange(MENU_PRESET_IMAGES[0].path);
                  setUploadMeta(null);
                }}
                title="ডিফল্ট ছবিতে ফিরুন"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-[#111815]/15 bg-white px-2.5 py-1.5 text-xs font-medium text-[#525B56] hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>রিসেট</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[#525B56]">
            {isDragging
              ? 'ছবিটি এখানে ছেড়ে দিন...'
              : 'যেকোনো JPG/PNG/WebP ছবি সিলেক্ট বা টেনে এনে ছাড়ুন — স্বয়ংক্রিয়ভাবে দ্রুত লোডের জন্য অপ্টিমাইজ হয়ে যাবে।'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <p className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800">
          {errorMsg}
        </p>
      )}

      {/* Built-in Ready Dish Photo Gallery */}
      {showGallery && (
        <div
          data-testid={`${testIdPrefix}-gallery-grid`}
          className="rounded-lg border border-[#111815]/15 bg-white p-3 space-y-2"
        >
          <p className="text-xs font-semibold text-[#111815]">
            রেডিমেড খাবারের গ্যালারি থেকে ১-ক্লিকে ছবি বেছে নিন:
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {MENU_PRESET_IMAGES.map((preset) => {
              const selected = value === preset.path;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChange(preset.path);
                    setUploadMeta(`"${preset.label}" ছবি নির্বাচিত হয়েছে`);
                    onStatusMessage?.(`"${preset.label}" ছবি নির্বাচিত হয়েছে।`);
                    setShowGallery(false);
                  }}
                  className={`group relative overflow-hidden rounded-md border text-left transition-all cursor-pointer ${
                    selected
                      ? 'border-[#C5A059] ring-2 ring-[#C5A059]'
                      : 'border-[#111815]/15 hover:border-[#111815]/40'
                  }`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#18221D]">
                    <img
                      src={preset.path}
                      alt={preset.label}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="truncate bg-[#FFFDF9] px-1.5 py-1 text-[10px] font-semibold text-[#111815]">
                    {preset.label}
                  </div>
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#111815] text-[#C5A059]">
                      <Check className="h-2.5 w-2.5" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Optional Direct URL Input */}
      {showUrlInput && (
        <div className="space-y-1">
          <input
            type="text"
            value={isInlineDataUrl ? '' : value}
            onChange={(e) => {
              setUploadMeta(null);
              onChange(e.target.value);
            }}
            placeholder={
              isInlineDataUrl
                ? 'আপলোড করা ছবি চালু আছে — চাইলে নতুন https:// ছবির লিংক পেস্ট করুন'
                : 'https://example.com/kacchi.jpg'
            }
            aria-label="ছবির সরাসরি URL লিংক"
            data-testid={`${testIdPrefix}-url-input`}
            className="block w-full min-h-[38px] rounded border border-[#111815]/20 bg-white px-3 text-xs"
          />
        </div>
      )}
    </div>
  );
}
