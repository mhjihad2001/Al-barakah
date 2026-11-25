import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';

/**
 * Maximum string length allowed for MenuItem.image in firebase-blueprint.json & firestore.rules.
 */
export const MAX_MENU_IMAGE_LENGTH = 180_000;
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface PresetDishImage {
  id: string;
  label: string;
  path: string;
}

export const MENU_PRESET_IMAGES: PresetDishImage[] = [
  {
    id: 'mutton-kacchi',
    label: 'রাজকীয় মাটন কাচ্চি',
    path: '/src/assets/images/menu_mutton_kacchi_1794979671160.jpg',
  },
  {
    id: 'beef-tehari',
    label: 'সরিষার তেলের গরুর তেহারি',
    path: '/src/assets/images/menu_beef_tehari_1794979672672.jpg',
  },
  {
    id: 'morog-polao',
    label: 'শাহী ঘি মোরগ পোলাও',
    path: '/src/assets/images/menu_morog_polao_1794979670687.jpg',
  },
  {
    id: 'raan-feast',
    label: 'আস্ত খাসির রান রোস্ট',
    path: '/src/assets/images/menu_raan_feast_1794979674245.jpg',
  },
  {
    id: 'jali-kebab',
    label: 'গরুর জালি ও শামি কাবাব',
    path: '/src/assets/images/menu_jali_kebab_1794979672863.jpg',
  },
  {
    id: 'sheekh-reshmi',
    label: 'রেশমি ও মাটন বটি কাবাব',
    path: '/src/assets/images/menu_sheekh_reshmi_1794979673797.jpg',
  },
  {
    id: 'shahi-tukra',
    label: 'জাফরানি ফিরনি ও শাহী টুকরা',
    path: '/src/assets/images/menu_shahi_tukra_1794979672637.jpg',
  },
  {
    id: 'borhani-badam',
    label: 'পুদিনা বোরহানি ও বাদাম শরবত',
    path: '/src/assets/images/menu_borhani_badam_1794979674421.jpg',
  },
  {
    id: 'royal-dastarkhwan',
    label: 'রাজকীয় দাওয়াত প্ল্যাটার',
    path: '/src/assets/images/hero_royal_dastarkhwan_1794979671876.jpg',
  },
];

export interface MenuImageUploadResult {
  url: string;
  storageMode: 'firebase-storage' | 'inline-compressed';
  sizeKB: number;
}

export function isValidImageSource(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_MENU_IMAGE_LENGTH) return false;
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ছবিটি পড়া যায়নি।'));
      }
    };
    reader.onerror = () => reject(new Error('ছবিটি লোড করতে সমস্যা হয়েছে।'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ছবির ফরম্যাটটি সঠিক নয় বা পড়া যায়নি।'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('ছবিটি প্রসেস করা যায়নি।'));
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Resizes and compresses a selected image file into a crisp, fast-loading JPEG
 * guaranteed to fit within MAX_MENU_IMAGE_LENGTH for fallback sync.
 */
export async function optimizeMenuImageFile(file: File): Promise<{
  blob: Blob;
  dataUrl: string;
  sizeKB: number;
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('অনুগ্রহ করে শুধুমাত্র ছবির ফাইল (JPG, PNG, WebP) নির্বাচন করুন।');
  }
  if (file.size > MAX_RAW_FILE_BYTES) {
    throw new Error('ছবির সাইজ ১৫ মেগাবাইটের কম হতে হবে।');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImageElement(rawDataUrl);

  const attempts: Array<{ maxDim: number; quality: number }> = [
    { maxDim: 760, quality: 0.8 },
    { maxDim: 640, quality: 0.72 },
    { maxDim: 520, quality: 0.64 },
    { maxDim: 420, quality: 0.56 },
  ];

  let finalDataUrl = '';
  let finalBlob: Blob | null = null;

  for (const { maxDim, quality } of attempts) {
    const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const width = Math.max(1, Math.round((img.width || 600) * ratio));
    const height = Math.max(1, Math.round((img.height || 450) * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('ব্রাউজারে ছবি প্রসেসিং সাপোর্ট পাওয়া যায়নি।');
    }

    // Fill warm dark neutral background in case of transparent PNG
    ctx.fillStyle = '#18221D';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    finalDataUrl = canvas.toDataURL('image/jpeg', quality);
    finalBlob = await canvasToBlob(canvas, quality);

    if (finalDataUrl.length <= MAX_MENU_IMAGE_LENGTH - 4000) {
      break;
    }
  }

  if (!finalBlob || !finalDataUrl || finalDataUrl.length > MAX_MENU_IMAGE_LENGTH) {
    throw new Error('ছবিটি অনেক বড় হয়ে গেছে, অনুগ্রহ করে আরেকটি ছবি চেষ্টা করুন।');
  }

  return {
    blob: finalBlob,
    dataUrl: finalDataUrl,
    sizeKB: Math.max(1, Math.round(finalBlob.size / 1024)),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Storage upload timed out'));
    }, ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Optimizes the selected image file, attempts upload to Firebase Storage when signed in
 * (returning a short HTTPS download URL compatible with Web + Android Coil), and falls back
 * seamlessly to a strictly bounded compressed JPEG data URL so uploads never fail.
 */
export async function uploadMenuImage(
  file: File,
  itemHint = 'dish'
): Promise<MenuImageUploadResult> {
  const optimized = await optimizeMenuImageFile(file);

  if (auth.currentUser) {
    try {
      const safeHint =
        itemHint
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 32) || 'dish';
      const storageRef = ref(storage, `menu_images/${safeHint}-${Date.now()}.jpg`);
      await withTimeout(
        uploadBytes(storageRef, optimized.blob, {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        }),
        7000
      );
      const downloadUrl = await withTimeout(getDownloadURL(storageRef), 5000);
      if (downloadUrl && downloadUrl.length <= MAX_MENU_IMAGE_LENGTH) {
        return {
          url: downloadUrl,
          storageMode: 'firebase-storage',
          sizeKB: optimized.sizeKB,
        };
      }
    } catch {
      // If Firebase Storage isn't activated or rules deny write, fall back seamlessly
    }
  }

  return {
    url: optimized.dataUrl,
    storageMode: 'inline-compressed',
    sizeKB: optimized.sizeKB,
  };
}
