'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ImageCropper from '@/components/ImageCropper';
import BookingCalendar from '@/components/BookingCalendar';
import { TRANSLATIONS } from '@/lib/translations';

interface Creator {
  id: string;
  telegram_id: number;
  username: string | null;
  is_premium?: boolean;
  payment_details?: {
    ton?: string;
    p2p?: string;
    ton_list?: { id: string; label: string; address: string }[];
    p2p_list?: { id: string; label: string; card: string }[];
    pending_file_id?: string;
    pending_file_name?: string;
    pending_cover_id?: string;
  };
  profile_customization?: {
    store_name?: string;
    store_description?: string;
    avatar_url?: string;
    banner_url?: string;
    social_links?: {
      youtube?: string;
      instagram?: string;
      tiktok?: string;
      vk?: string;
      max?: string;
    };
  };
}

interface Product {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  price_fiat: number;
  price_stars: number;
  content_url: string;
  cover_url?: string;
  creator?: Creator;
  product_type?: string;
  sold_count?: number;
}

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

// Translations have been extracted to src/lib/translations.ts


// Sub-components: ImageCropper component has been extracted to @/components/ImageCropper

function LoadingScreen({ lang = 'en' }: { lang?: 'en' | 'ru' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100svh',
      background: 'var(--tg-bg)', gap: '14px',
    }}>
      {/* Telegram-style spinner */}
      <div style={{
        width: '36px', height: '36px',
        border: '3px solid var(--tg-border)',
        borderTopColor: 'var(--tg-accent)',
        borderRadius: '50%',
      }} className="animate-spin-slow" />
      <p style={{ color: 'var(--tg-hint)', fontSize: '14px', fontWeight: 500 }}>
        {lang === 'ru' ? 'Загрузка…' : 'Loading…'}
      </p>
    </div>
  );
}

function ErrorScreen({ message, onBack, lang = 'en' }: { message: string; onBack: () => void; lang?: 'en' | 'ru' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100svh', padding: '24px',
      textAlign: 'center', gap: '12px',
    }} className="animate-fade-in">
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'rgba(233,92,92,0.12)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '24px',
      }}>⚠️</div>
      <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--tg-text)' }}>
        {lang === 'ru' ? 'Витрина недоступна' : 'Storefront Unavailable'}
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--tg-hint)', maxWidth: '280px', lineHeight: 1.6 }}>
        {message}
      </p>
      <button className="btn-secondary" style={{ maxWidth: '200px', marginTop: '8px' }} onClick={onBack}>
        ← {lang === 'ru' ? 'Назад' : 'Back'}
      </button>
    </div>
  );
}

interface ProductListScreenProps {
  products: Product[];
  onSelect: (id: string) => void;
  creator: Creator | null;
  storeName: string;
  setStoreName: (name: string) => void;
  storeDescription: string;
  setStoreDescription: (desc: string) => void;
  storeAvatar: string;
  setStoreAvatar: (avatar: string) => void;
  storeBanner: string;
  setStoreBanner: (banner: string) => void;
  socialLinks: { youtube?: string; instagram?: string; tiktok?: string; vk?: string; max?: string; };
  setSocialLinks: (links: any) => void;
  onAddProduct: (title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string) => Promise<boolean>;
  onOpenPremium: () => void;
  lang: 'en' | 'ru';
  setLang: (lang: 'en' | 'ru') => void;
  isOwner: boolean;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onUpdateProduct: (id: string, title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string) => Promise<boolean>;
}

const showAlert = (message: string) => {
  if (typeof window !== 'undefined') {
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp?.showAlert) {
      WebApp.showAlert(message);
      return;
    }
  }
  alert(message);
};

const cleanProductId = (id: string | null): string | null => {
  if (!id) return null;
  if (id.startsWith('ref_')) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('paybio_referrer_tg_id', id.substring(4));
    }
    return null;
  }
  return id;
};

// Social Icons SVGs Helper
const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.387.51A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.862.51 9.387.51 9.387.51s7.524 0 9.387-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const TiktokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.85.96 2.05 1.62 3.32 1.89v3.83c-1.42-.03-2.81-.46-4.01-1.23a8.91 8.91 0 0 1-2.22-2.12v9.38c.03 2.16-.76 4.31-2.22 5.85A7.842 7.842 0 0 1 7.22 24c-2.45.03-4.83-1.07-6.23-3.08-1.52-2.02-1.92-4.73-1.09-7.07.82-2.46 2.87-4.41 5.37-4.99 1.48-.37 3.04-.15 4.38.61v4.13c-.88-.56-1.95-.73-2.96-.45-1.02.26-1.89.99-2.31 1.95-.57 1.22-.4 2.73.43 3.77.82.97 2.12 1.44 3.37 1.22 1.4-.2 2.53-1.39 2.69-2.8.04-1 .02-2 .03-3V0h.41v.02z"/>
  </svg>
);

const VkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.46 0H1.54A1.54 1.54 0 0 0 0 1.54v20.92A1.54 1.54 0 0 0 1.54 24h20.92A1.54 1.54 0 0 0 24 22.46V1.54A1.54 1.54 0 0 0 22.46 0zm-3.69 17h-1.54c-.65 0-1.12-.22-1.42-.58-.46-.54-.92-1.42-1.42-1.42-.11 0-.2.05-.2.18v1.32c0 .4-.13.5-.78.5-2.09 0-4.41-1.35-6.07-3.75-.43-.63-1-1.74-1-1.74s-.07-.15-.07-.22c0-.07.07-.12.23-.12h1.58c.41 0 .52.12.63.36 1 2 2.1 3.51 2.68 3.51.13 0 .19-.07.19-.24v-2.85c0-.62-.17-.74-.69-.74h-.4c-.13 0-.17-.07-.17-.18 0-.25.32-.47.83-.47h2.24c.48 0 .58.12.58.58v2.33c0 .17.07.24.16.24.13 0 .22-.07.38-.25a13.3 13.3 0 0 0 1.74-2.32c.07-.16.15-.29.49-.29h1.59c.47 0 .58.1.58.33 0 .13-.05.29-.19.49-.78 1.12-1.84 2.58-1.84 2.58s-.09.12 0 .24c.09.12.39.38.78.78.85.85 1.55 1.77 1.71 2.15.08.18 0 .28-.46.28z"/>
  </svg>
);

const MaxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

function ProductListScreen({
  products,
  onSelect,
  creator,
  storeName,
  setStoreName,
  storeDescription,
  setStoreDescription,
  storeAvatar,
  setStoreAvatar,
  storeBanner,
  setStoreBanner,
  socialLinks,
  setSocialLinks,
  onAddProduct,
  onOpenPremium,
  lang,
  setLang,
  isOwner,
  onDeleteProduct,
  onUpdateProduct
}: ProductListScreenProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditSocialsOpen, setIsEditSocialsOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creationStep, setCreationStep] = useState<'TYPE_SELECT' | 'FORM'>('TYPE_SELECT');

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdTitle(p.title);
    setProdDesc(p.description || '');
    setProdPriceUSD(String(p.price_fiat));
    setProdPriceStars(p.price_stars ? String(p.price_stars) : '');
    setProdCoverUrl(p.cover_url || '');
    setProdType(p.product_type || 'DIGITAL');

    let urlVal = p.content_url || '';
    let icsVal = '';
    let maxVal = '';
    if (p.product_type === 'BOOKING' || p.product_type === 'VOUCHER') {
      try {
        const parsed = JSON.parse(p.content_url);
        if (parsed) {
          if (p.product_type === 'BOOKING') {
            urlVal = parsed.slots || '';
            icsVal = parsed.ics_url || '';
          } else if (p.product_type === 'VOUCHER') {
            urlVal = parsed.fulfillment_url || '';
            maxVal = parsed.max_quantity ? String(parsed.max_quantity) : '';
          }
        }
      } catch (e) {
        // ignore
      }
    }
    setProdUrl(urlVal);
    setProdCalendarIcsUrl(icsVal);
    setProdMaxQuantity(maxVal);
    setCreationStep('FORM');
    setIsAddProductOpen(true);
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdDesc('');
    setProdPriceUSD('');
    setProdPriceStars('');
    setProdUrl('');
    setProdCalendarIcsUrl('');
    setProdMaxQuantity('');
    setProdCoverUrl('');
    setAiPrompt('');
    setProdType('DIGITAL');
    setCreationStep('TYPE_SELECT');
    setIsAddProductOpen(true);
  };

  // Edit profile form state
  const [tempName, setTempName] = useState(storeName);
  const [tempDesc, setTempDesc] = useState(storeDescription);

  // Social Links form state
  const [tempYoutube, setTempYoutube] = useState(socialLinks.youtube || '');
  const [tempInsta, setTempInsta] = useState(socialLinks.instagram || '');
  const [tempTiktok, setTempTiktok] = useState(socialLinks.tiktok || '');
  const [tempVk, setTempVk] = useState(socialLinks.vk || '');
  const [tempMax, setTempMax] = useState(socialLinks.max || '');

  // Add product form state
  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPriceUSD, setProdPriceUSD] = useState('');
  const [prodPriceStars, setProdPriceStars] = useState('');
  const [prodUrl, setProdUrl] = useState('');
  const [prodCalendarIcsUrl, setProdCalendarIcsUrl] = useState('');
  const [prodMaxQuantity, setProdMaxQuantity] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Product cover visual state
  const [prodCoverUrl, setProdCoverUrl] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // Image cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState('');
  const [cropperAspect, setCropperAspect] = useState(1);
  const [cropperCircular, setCropperCircular] = useState(false);
  const [onCropComplete, setOnCropComplete] = useState<((cropped: string) => void) | null>(null);

  // New product type states
  const [prodType, setProdType] = useState('DIGITAL');

  // AI Promo generation states
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoText, setPromoText] = useState('');
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [selectedPromoProduct, setSelectedPromoProduct] = useState<any>(null);
  const [promoCopied, setPromoCopied] = useState(false);

  const handleConfirmDelete = (productId: string, productTitle: string) => {
    const confirmMsg = lang === 'ru' 
      ? `Вы уверены, что хотите удалить товар "${productTitle}"?`
      : `Are you sure you want to delete product "${productTitle}"?`;

    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.showConfirm) {
        WebApp.showConfirm(confirmMsg, async (ok: boolean) => {
          if (ok) {
            await executeDelete(productId);
          }
        });
        return;
      }
    }
    
    if (window.confirm(confirmMsg)) {
      executeDelete(productId);
    }
  };

  const executeDelete = async (productId: string) => {
    try {
      const success = await onDeleteProduct(productId);
      if (success) {
        showAlert(lang === 'ru' ? '✓ Товар успешно удален' : '✓ Product deleted successfully');
      } else {
        showAlert(lang === 'ru' ? 'Не удалось удалить товар' : 'Failed to delete product');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error deleting product');
    }
  };

  const handleGeneratePromo = async (p: any) => {
    setSelectedPromoProduct(p);
    setIsPromoOpen(true);
    setIsGeneratingPromo(true);
    setPromoText('');
    try {
      const res = await fetch(`/api/promo/generate?product_id=${p.id}`);
      const data = await res.json();
      if (res.ok && data.success && data.text) {
        setPromoText(data.text);
      } else {
        setPromoText(lang === 'ru' ? 'Не удалось сгенерировать промо-текст.' : 'Failed to generate promo text.');
      }
    } catch (err: any) {
      setPromoText(err.message || 'Error generating promo.');
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  const handleCopyPromo = () => {
    if (!promoText) return;
    navigator.clipboard.writeText(promoText).then(() => {
      setPromoCopied(true);
      setTimeout(() => setPromoCopied(false), 2000);
    });
  };

  const handleShareAffiliateLink = async () => {
    if (!creator) return;
    const tgId = creator.telegram_id;
    const affiliateLink = `https://t.me/PaybioBot/app?startapp=ref_${tgId}`;
    const shareText = lang === 'ru'
      ? '🚀 Создай свой ИИ-магазин цифровых товаров за 1 минуту в Telegram с помощью PayBio!'
      : '🚀 Build your AI-powered Telegram storefront for digital products in 1 minute with PayBio!';
      
    try {
      const WebApp = (await import('@twa-dev/sdk')).default;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(shareText)}`;
      WebApp.openTelegramLink(shareUrl);
    } catch (err) {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);
  const [tempTon, setTempTon] = useState('');
  const [tempP2p, setTempP2p] = useState('');

  const [tonConnectUI, setTonConnectUI] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Load TON Connect UI SDK from CDN dynamically
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@tonconnect/ui@2.0.9/dist/tonconnect-ui.min.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TON_CONNECT_UI) {
        const tc = new (window as any).TON_CONNECT_UI.TonConnectUI({
          manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
        });
        setTonConnectUI(tc);
      }
    };
    document.body.appendChild(script);
    
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    if (!tonConnectUI) {
      showAlert(lang === 'ru' ? 'Загрузка TON SDK...' : 'Loading TON SDK...');
      return;
    }
    try {
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
      
      await tonConnectUI.openModal();
      
      const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
        if (wallet && wallet.account) {
          const rawAddress = wallet.account.address;
          const friendlyAddr = (window as any).TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
          setTempTon(friendlyAddr);
          showAlert(lang === 'ru' ? '✓ Кошелек успешно подключен!' : '✓ Wallet connected successfully!');
          unsubscribe();
        }
      });
    } catch (e) {
      console.error('Wallet connection error:', e);
      showAlert(lang === 'ru' ? 'Ошибка подключения кошелька' : 'Wallet connection error');
    }
  };
  
  // Lists for premium users
  const [tonList, setTonList] = useState<{ id: string; label: string; address: string }[]>([]);
  const [p2pList, setP2pList] = useState<{ id: string; label: string; card: string }[]>([]);
  
  // Add new source form states
  const [newTonLabel, setNewTonLabel] = useState('');
  const [newTonAddr, setNewTonAddr] = useState('');
  const [newP2pLabel, setNewP2pLabel] = useState('');
  const [newP2pCard, setNewP2pCard] = useState('');

  useEffect(() => {
    if (creator) {
      const pd = creator.payment_details || {};
      setTempTon(pd.ton || '');
      setTempP2p(pd.p2p || '');
      setTonList(pd.ton_list || []);
      setP2pList(pd.p2p_list || []);
    }
  }, [creator, isPaymentSettingsOpen]);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) return;
    try {
      const pd = creator.payment_details || {};
      const newDetails = {
        ...pd,
        ton: tempTon,
        p2p: tempP2p,
        ton_list: isCreatorPremium ? tonList : [],
        p2p_list: isCreatorPremium ? p2pList : []
      };
      
      const res = await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: creator.id,
          customization: creator.profile_customization || {},
          payment_details: newDetails
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(lang === 'ru' ? '✓ Настройки оплаты сохранены!' : '✓ Payment settings saved!');
        setIsPaymentSettingsOpen(false);
        window.location.reload();
      } else {
        showAlert(data.error || 'Failed to save payment settings.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error saving settings.');
    }
  };

  const t = TRANSLATIONS[lang];

  // Update temp values when props change
  useEffect(() => {
    setTempName(storeName);
    setTempDesc(storeDescription);
  }, [storeName, storeDescription, isEditProfileOpen]);

  useEffect(() => {
    setTempYoutube(socialLinks.youtube || '');
    setTempInsta(socialLinks.instagram || '');
    setTempTiktok(socialLinks.tiktok || '');
    setTempVk(socialLinks.vk || '');
    setTempMax(socialLinks.max || '');
  }, [socialLinks, isEditSocialsOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreName(tempName);
    setStoreDescription(tempDesc);
    if (creator) {
      localStorage.setItem(`paybio_name_${creator.id}`, tempName);
      localStorage.setItem(`paybio_desc_${creator.id}`, tempDesc);

      try {
        const pc = creator.profile_customization || {};
        const updatedCustom = {
          ...pc,
          store_name: tempName,
          store_description: tempDesc
        };
        await fetch('/api/store/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
        });
      } catch (err) {
        console.error('Error saving profile to database:', err);
      }
    }
    setIsEditProfileOpen(false);
  };

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSocials = {
      youtube: tempYoutube,
      instagram: tempInsta,
      tiktok: tempTiktok,
      vk: tempVk,
      max: tempMax
    };
    setSocialLinks(newSocials);
    if (creator) {
      localStorage.setItem(`paybio_socials_${creator.id}`, JSON.stringify(newSocials));

      try {
        const pc = creator.profile_customization || {};
        const updatedCustom = {
          ...pc,
          social_links: newSocials
        };
        await fetch('/api/store/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
        });
      } catch (err) {
        console.error('Error saving socials to database:', err);
      }
    }
    setIsEditSocialsOpen(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle || !prodPriceUSD) return;
    setIsAdding(true);
    try {
      const priceUSD = Number(prodPriceUSD);
      const priceStars = prodPriceStars ? Number(prodPriceStars) : undefined;

      let finalContentUrl = prodUrl || '';
      if (prodType === 'BOOKING') {
        finalContentUrl = JSON.stringify({
          slots: prodUrl,
          ics_url: prodCalendarIcsUrl
        });
      } else if (prodType === 'VOUCHER') {
        finalContentUrl = JSON.stringify({
          fulfillment_url: prodUrl,
          max_quantity: prodMaxQuantity ? Number(prodMaxQuantity) : null
        });
      }

      let success = false;
      if (editingProduct) {
        success = await onUpdateProduct(
          editingProduct.id,
          prodTitle,
          prodDesc,
          priceUSD,
          priceStars,
          finalContentUrl,
          prodCoverUrl || undefined,
          prodType
        );
      } else {
        success = await onAddProduct(
          prodTitle, 
          prodDesc, 
          priceUSD, 
          priceStars, 
          finalContentUrl || undefined, 
          prodCoverUrl || undefined,
          prodType
        );
      }

      if (success) {
        setProdTitle('');
        setProdDesc('');
        setProdPriceUSD('');
        setProdPriceStars('');
        setProdUrl('');
        setProdCalendarIcsUrl('');
        setProdMaxQuantity('');
        setProdCoverUrl('');
        setAiPrompt('');
        setProdType('DIGITAL');
        setEditingProduct(null);
        setIsAddProductOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperSrc(reader.result as string);
        setCropperAspect(1);
        setCropperCircular(true);
        setOnCropComplete(() => async (cropped: string) => {
          setStoreAvatar(cropped);
          if (creator) {
            localStorage.setItem(`paybio_avatar_${creator.id}`, cropped);
            try {
              const pc = creator.profile_customization || {};
              const updatedCustom = {
                ...pc,
                avatar_url: cropped
              };
              await fetch('/api/store/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
              });
            } catch (err) {
              console.error('Error saving avatar to database:', err);
            }
          }
        });
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperSrc(reader.result as string);
        setCropperAspect(3);
        setCropperCircular(false);
        setOnCropComplete(() => async (cropped: string) => {
          setStoreBanner(cropped);
          if (creator) {
            localStorage.setItem(`paybio_banner_${creator.id}`, cropped);
            try {
              const pc = creator.profile_customization || {};
              const updatedCustom = {
                ...pc,
                banner_url: cropped
              };
              await fetch('/api/store/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
              });
            } catch (err) {
              console.error('Error saving banner to database:', err);
            }
          }
        });
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleProdCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropperSrc(reader.result as string);
        setCropperAspect(1.333);
        setCropperCircular(false);
        setOnCropComplete(() => (cropped: string) => {
          setProdCoverUrl(cropped);
        });
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const executeRedeem = async (qrData: string) => {
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_data: qrData })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(lang === 'ru' ? `✅ Билет успешно погашен!\nТовар: "${data.voucher.order?.product?.title || 'Ваучер'}"` : `✅ Voucher Redeemed Successfully!\nProduct: "${data.voucher.order?.product?.title || 'Voucher'}"`);
      } else {
        showAlert(lang === 'ru' ? `❌ Ошибка: ${data.error}` : `❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      showAlert(err.message || 'Error processing ticket redemption.');
    }
  };

  const handleScanTicket = () => {
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      const confirmMsg = lang === 'ru'
        ? "Вы хотите погасить билет?"
        : "Do you want to redeem the ticket?";

      if (WebApp?.showScanQrPopup) {
        WebApp.showScanQrPopup({ text: lang === 'ru' ? "Сканируйте QR-код билета" : "Scan Buyer's QR" }, async (text: string) => {
          WebApp.closeScanQrPopup();
          if (WebApp?.showConfirm) {
            WebApp.showConfirm(confirmMsg, async (ok: boolean) => {
              if (ok) {
                await executeRedeem(text);
              }
            });
          } else {
            if (window.confirm(confirmMsg)) {
              await executeRedeem(text);
            }
          }
          return true;
        });
      } else {
        const qr = prompt(lang === 'ru' ? "Введите хэш QR-кода билета:" : "Enter scanned QR voucher code:");
        if (qr) {
          if (window.confirm(confirmMsg)) {
            executeRedeem(qr);
          }
        }
      }
    }
  };

  const handleGenerateAICover = async () => {
    if (!aiPrompt) return;
    setIsGeneratingCover(true);
    try {
      const res = await fetch('/api/store/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (res.ok && data.success && data.image_url) {
        setProdCoverUrl(data.image_url);
        showAlert(lang === 'ru' ? '🎨 Обложка успешно сгенерирована!' : '🎨 Image cover generated successfully!');
      } else {
        showAlert(data.error || 'Failed to generate image.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error generating image.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // Emojis for mock product cover styles (used as fallback)
  const coverStyles = [
    { bg: 'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)', icon: '📘' }, // Ebook
    { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '⚡' }, // Tutorial
    { bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', icon: '🎨' }, // Assets
    { bg: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', icon: '🛠' }, // Toolkit
    { bg: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', icon: '💡' }, // Idea
  ];

  const isCreatorPremium = creator?.is_premium;
  const hasSocials = socialLinks.youtube || socialLinks.instagram || socialLinks.tiktok || socialLinks.vk || socialLinks.max;

  return (
    <div style={{ minHeight: '100svh', background: 'var(--tg-bg)', position: 'relative' }} className="animate-fade-in">
      
      {/* ─── BANNER ─── */}
      <div 
        className="store-banner animate-fade-in" 
        style={storeBanner ? { backgroundImage: `url(${storeBanner})` } : undefined}
      >
        <div className="store-banner-glow" />
        {isOwner && (
          <label className="store-banner-edit">
            📸 Change Cover
            <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {/* ─── PROFILE HEADER CARD ─── */}
      <div className="store-avatar-wrapper">
        {storeAvatar ? (
          <img src={storeAvatar} alt="Store Avatar" className="store-avatar-img" />
        ) : (
          <div className="store-avatar-fallback">
            {storeName.slice(0, 1).toUpperCase()}
          </div>
        )}
        {isOwner && (
          <label className="store-upload-trigger">
            📷
            <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {/* ─── SHOP INFORMATION ─── */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.5px' }}>
            {storeName}
          </h1>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isOwner && (
              <>
                <button 
                  onClick={() => setIsEditProfileOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', fontSize: '13px'
                  }}
                  title={t.editShopDetails}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => setIsEditSocialsOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', fontSize: '13px'
                  }}
                  title={t.configureSocials}
                >
                  🔗
                </button>
                <button 
                  onClick={() => setIsPaymentSettingsOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', fontSize: '13px'
                  }}
                  title={lang === 'ru' ? 'Настройки оплаты' : 'Payment Settings'}
                >
                  💳
                </button>
              </>
            )}
            
            {/* Language Switcher */}
            <button 
              onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
              style={{
                background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '14px',
                padding: '0 8px', height: '28px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                color: 'var(--tg-text)'
              }}
              title="Change Language / Сменить язык"
            >
              🌐 {lang === 'en' ? 'EN' : 'RU'}
            </button>

            {isOwner && (
              /* Scan Ticket (Zero-Backend QR scanner) */
              <button 
                onClick={handleScanTicket}
                style={{
                  background: 'rgba(77,202,90,0.15)', border: 'none', borderRadius: '14px',
                  padding: '0 8px', height: '28px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                  color: '#4dca5a'
                }}
                title={lang === 'ru' ? 'Сканировать билет' : 'Scan Ticket'}
              >
                📷 {lang === 'ru' ? 'Сканировать' : 'Scan Ticket'}
              </button>
            )}

            {isCreatorPremium ? (
              <span className="chip" style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', fontSize: '10px', padding: '2px 8px' }}>
                {t.premiumCreator}
              </span>
            ) : (
              isOwner && (
                <button 
                  onClick={onOpenPremium}
                  className="chip chip-blue" 
                  style={{ border: 'none', cursor: 'pointer', fontSize: '10px', padding: '2px 8px' }}
                >
                  {t.goPremium}
                </button>
              )
            )}
          </div>
        </div>
        
        {creator?.username && (
          <p style={{ fontSize: '13px', color: 'var(--tg-accent)', fontWeight: 600, marginTop: '2px' }}>
            @{creator.username}
          </p>
        )}

        <p style={{ fontSize: '13.5px', color: 'var(--tg-hint)', marginTop: '8px', lineHeight: 1.6 }}>
          {storeDescription}
        </p>

        {/* ─── SOCIAL LINKS ROW ─── */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          {socialLinks.youtube && (
            <a href={socialLinks.youtube} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(233,92,92,0.12)', color: '#FF0000',
              border: '1px solid rgba(233,92,92,0.2)', transition: 'transform 0.2s'
            }} className="animate-scale-in">
              <YoutubeIcon />
            </a>
          )}
          {socialLinks.instagram && (
            <a href={socialLinks.instagram} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(45deg, rgba(240,148,51,0.12) 0%, rgba(230,73,128,0.12) 100%)', color: '#E1306C',
              border: '1px solid rgba(230,73,128,0.2)', transition: 'transform 0.2s'
            }} className="animate-scale-in">
              <InstagramIcon />
            </a>
          )}
          {socialLinks.tiktok && (
            <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.3)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s'
            }} className="animate-scale-in">
              <TiktokIcon />
            </a>
          )}
          {socialLinks.vk && (
            <a href={socialLinks.vk} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(74,118,168,0.12)', color: '#4A76A8',
              border: '1px solid rgba(74,118,168,0.2)', transition: 'transform 0.2s'
            }} className="animate-scale-in">
              <VkIcon />
            </a>
          )}
          {socialLinks.max && (
            <a href={socialLinks.max} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              border: '1px solid var(--tg-border)', transition: 'transform 0.2s'
            }} className="animate-scale-in">
              <MaxIcon />
            </a>
          )}
          
          {/* Quick link config helper for editor */}
          {isOwner && !hasSocials && (
            <button 
              onClick={() => setIsEditSocialsOpen(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--tg-hint)',
                fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                cursor: 'pointer', opacity: 0.8, textDecoration: 'underline'
              }}
            >
              {t.addSocialsHelp}
            </button>
          )}
        </div>

        {/* Stats Row */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px',
          marginTop: '20px', padding: '12px', background: 'var(--tg-secondary-bg)',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--tg-border)',
          textAlign: 'center'
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.products}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-text)', marginTop: '2px' }}>{products.length}</p>
          </div>
          <div style={{ borderLeft: '1px solid var(--tg-border)', borderRight: '1px solid var(--tg-border)' }}>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.rating}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-text)', marginTop: '2px' }}>4.9 ★</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.delivery}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-green)', marginTop: '2px' }}>{t.instant}</p>
          </div>
        </div>
      </div>

      {/* ─── NATIVE TELEGRAM AFFILIATE BANNER ─── */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(142,45,226,0.15) 0%, rgba(74,0,224,0.15) 100%)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(142,45,226,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '24px' }}>⭐</span>
            <div>
              <h4 style={{ fontWeight: 800, fontSize: '15px', color: 'var(--tg-text)', margin: 0 }}>
                {lang === 'ru' ? 'Реферальная программа 10% ⭐' : 'Affiliate Program 10% ⭐'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--tg-hint)', marginTop: '2px', lineHeight: 1.4 }}>
                {lang === 'ru' 
                  ? 'Приглашайте авторов и получайте комиссию 10% со всех их продаж в Telegram Stars!' 
                  : 'Invite other creators and earn a native 10% commission on all their Star sales!'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleShareAffiliateLink}
            className="btn-primary"
            style={{ 
              background: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', 
              color: '#fff', 
              padding: '10px', 
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            🔗 {lang === 'ru' ? 'Пригласить авторов' : 'Invite Creators'}
          </button>
        </div>
      </div>

      {/* ─── PRODUCT LIST SECTION ─── */}
      <div style={{ padding: '0 16px 80px' }}>
        <p className="section-header" style={{ marginBottom: '14px' }}>{t.storeCatalog}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="stagger">
          
          {products.map((p, idx) => {
            const styleIdx = idx % coverStyles.length;
            const cover = coverStyles[styleIdx];
            return (
              <div key={p.id} className="large-product-card animate-fade-up">
                {/* Book cover / Graphic element */}
                <div 
                  className="large-product-cover" 
                  style={p.cover_url ? { backgroundImage: `url(${p.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: cover.bg }}
                >
                  <div className="large-product-cover-overlay" />
                  {!p.cover_url && <div className="large-product-icon">{cover.icon}</div>}
                </div>

                {/* Product info body */}
                <div className="large-product-body">
                  <h3 className="large-product-title">{p.title}</h3>
                  <p className="large-product-description">{p.description}</p>
                  
                  <div className="large-product-footer">
                    <div className="large-product-price-box">
                      <span className="large-product-price-fiat">${p.price_fiat}</span>
                      <span className="large-product-price-stars">⭐️ {p.price_stars} {t.stars}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="large-product-action-btn" onClick={() => onSelect(p.id)}>
                        {t.viewStorefront}
                      </button>
                      {isOwner && (
                        <>
                          <button 
                            className="large-product-action-btn animate-scale-in" 
                            style={{ background: 'rgba(255,165,0,0.15)', color: '#ffa500', border: '1px solid rgba(255,165,0,0.2)', width: 'auto', padding: '0 12px' }} 
                            onClick={(e) => { e.stopPropagation(); handleGeneratePromo(p); }}
                            title={lang === 'ru' ? 'Создать промо' : 'Create promo'}
                          >
                            📢
                          </button>
                          <button 
                            className="large-product-action-btn animate-scale-in" 
                            style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--tg-text)', border: '1px solid var(--tg-border)', width: 'auto', padding: '0 12px' }} 
                            onClick={(e) => { e.stopPropagation(); handleOpenEditProduct(p); }}
                            title={lang === 'ru' ? 'Редактировать' : 'Edit'}
                          >
                            ✏️
                          </button>
                          <button 
                            className="large-product-action-btn animate-scale-in" 
                            style={{ background: 'rgba(233,92,92,0.15)', color: '#ff4d4d', border: '1px solid rgba(233,92,92,0.2)', width: 'auto', padding: '0 12px' }} 
                            onClick={(e) => { e.stopPropagation(); handleConfirmDelete(p.id, p.title); }}
                            title={lang === 'ru' ? 'Удалить' : 'Delete'}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add product blank card */}
          {isOwner && (
            <div className="large-product-create-card animate-fade-up" onClick={handleOpenCreateProduct}>
              <div style={{ fontSize: '28px' }}>➕</div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>{t.addNewProduct}</p>
              <p style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>{t.clickToCreate}</p>
            </div>
          )}

        </div>
      </div>

      {/* ─── FLOATING ACTION BUTTON ─── */}
      {isOwner && (
        <button className="floating-add-btn" onClick={handleOpenCreateProduct}>
          ➕
        </button>
      )}

      {/* ─── BOTTOM SHEET: EDIT PROFILE ─── */}
      <div className={`bottom-sheet-overlay ${isEditProfileOpen ? 'active' : ''}`} onClick={() => setIsEditProfileOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsEditProfileOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <h2 className="bottom-sheet-title">{t.editShopDetails}</h2>
          
          <form onSubmit={handleSaveProfile}>
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.shopName}</label>
              <input 
                type="text" 
                className="tg-input" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.shopDescription}</label>
              <textarea 
                className="tg-input" 
                value={tempDesc} 
                onChange={(e) => setTempDesc(e.target.value)} 
                rows={4}
                style={{ resize: 'none' }}
                required 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
              {t.saveChanges}
            </button>
          </form>
        </div>
      </div>

      {/* ─── BOTTOM SHEET: EDIT SOCIALS (SPLASH SCREEN WITH INPUTS) ─── */}
      <div className={`bottom-sheet-overlay ${isEditSocialsOpen ? 'active' : ''}`} onClick={() => setIsEditSocialsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsEditSocialsOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <h2 className="bottom-sheet-title">{t.configureSocials}</h2>
          <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', textAlign: 'center', marginBottom: '20px' }}>
            {t.socialsHelp}
          </p>
          
          <form onSubmit={handleSaveSocials}>
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.youtubeLink}</label>
              <input 
                type="url" 
                className="tg-input" 
                placeholder="https://youtube.com/@yourchannel"
                value={tempYoutube} 
                onChange={(e) => setTempYoutube(e.target.value)} 
              />
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.instagramLink}</label>
              <input 
                type="url" 
                className="tg-input" 
                placeholder="https://instagram.com/yourprofile"
                value={tempInsta} 
                onChange={(e) => setTempInsta(e.target.value)} 
              />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.tiktokLink}</label>
              <input 
                type="url" 
                className="tg-input" 
                placeholder="https://tiktok.com/@yourprofile"
                value={tempTiktok} 
                onChange={(e) => setTempTiktok(e.target.value)} 
              />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.vkLink}</label>
              <input 
                type="url" 
                className="tg-input" 
                placeholder="https://vk.com/yourpage"
                value={tempVk} 
                onChange={(e) => setTempVk(e.target.value)} 
              />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.maxLink}</label>
              <input 
                type="url" 
                className="tg-input" 
                placeholder="https://x.com/yourhandle"
                value={tempMax} 
                onChange={(e) => setTempMax(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
              {t.applySocialLinks}
            </button>
          </form>
        </div>
      </div>

      {/* ─── BOTTOM SHEET: ADD PRODUCT ─── */}
      <div className={`bottom-sheet-overlay ${isAddProductOpen ? 'active' : ''}`} onClick={() => setIsAddProductOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsAddProductOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <h2 className="bottom-sheet-title">{editingProduct ? (lang === 'ru' ? 'Редактировать товар' : 'Edit Product') : t.addNewProduct}</h2>
          
          {creationStep === 'TYPE_SELECT' && !editingProduct ? (
            <div className="animate-fade-in" style={{ padding: '4px 0 16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--tg-hint)', textAlign: 'center', marginBottom: '20px', lineHeight: 1.4 }}>
                {lang === 'ru'
                  ? 'Выберите категорию товара для настройки индивидуального дизайна страницы'
                  : 'Choose a product category to set up a customized page design'}
              </p>
              
              <div className="type-selector-container">
                {/* DIGITAL */}
                <button
                  type="button"
                  className="type-card"
                  onClick={() => {
                    setProdType('DIGITAL');
                    setCreationStep('FORM');
                  }}
                >
                  <div className="type-card-icon" style={{ color: '#60a5fa' }}>💾</div>
                  <div className="type-card-info">
                    <span className="type-card-title">
                      {lang === 'ru' ? 'Цифровой товар' : 'Digital Product'}
                    </span>
                    <span className="type-card-desc">
                      {lang === 'ru' ? 'Файлы, книги, курсы, ссылки на контент' : 'Files, eBooks, courses, links to content'}
                    </span>
                  </div>
                </button>

                {/* VOUCHER */}
                <button
                  type="button"
                  className="type-card"
                  onClick={() => {
                    setProdType('VOUCHER');
                    setCreationStep('FORM');
                  }}
                >
                  <div className="type-card-icon" style={{ color: '#f87171' }}>🎟️</div>
                  <div className="type-card-info">
                    <span className="type-card-title">
                      {lang === 'ru' ? 'Билет или Ваучер' : 'Ticket or Voucher'}
                    </span>
                    <span className="type-card-desc">
                      {lang === 'ru' ? 'Электронный билет с QR-кодом для входа' : 'E-ticket with verification QR code'}
                    </span>
                  </div>
                </button>

                {/* BOOKING */}
                <button
                  type="button"
                  className="type-card"
                  onClick={() => {
                    setProdType('BOOKING');
                    setCreationStep('FORM');
                  }}
                >
                  <div className="type-card-icon" style={{ color: '#38bdf8' }}>📅</div>
                  <div className="type-card-info">
                    <span className="type-card-title">
                      {lang === 'ru' ? 'Запись на время' : 'Booking / Session'}
                    </span>
                    <span className="type-card-desc">
                      {lang === 'ru' ? 'Бронирование слотов в календаре, консультации' : 'Booking calendar slots, consultations'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateProduct} className="animate-fade-in">
              {/* Back to Type Selection Button (Only when creating, not editing) */}
              {!editingProduct && (
                <button
                  type="button"
                  onClick={() => setCreationStep('TYPE_SELECT')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--tg-link)',
                    fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: '4px', cursor: 'pointer', marginBottom: '14px', padding: 0
                  }}
                >
                  ← {lang === 'ru' ? 'Сменить тип товара' : 'Change product type'}
                </button>
              )}
              
              {/* Display selected type info badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)', marginBottom: '16px',
                border: '1px solid var(--tg-border)'
              }}>
                <span style={{ fontSize: '20px' }}>
                  {prodType === 'VOUCHER' ? '🎟️' : prodType === 'BOOKING' ? '📅' : '💾'}
                </span>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--tg-hint)', fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                    {lang === 'ru' ? 'Выбранный тип' : 'Selected Type'}
                  </span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
                    {prodType === 'VOUCHER' 
                      ? (lang === 'ru' ? 'Билет или Ваучер' : 'Ticket or Voucher')
                      : prodType === 'BOOKING'
                      ? (lang === 'ru' ? 'Запись на время' : 'Booking / Session')
                      : (lang === 'ru' ? 'Цифровой товар' : 'Digital Product')}
                  </span>
                </div>
              </div>

              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">{t.productTitle}</label>
                <input 
                  type="text" 
                  className="tg-input" 
                  placeholder="e.g. Beginners Guide to AI"
                  value={prodTitle} 
                  onChange={(e) => setProdTitle(e.target.value)} 
                  required 
                />
              </div>
              
              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">{t.productDesc}</label>
                <textarea 
                  className="tg-input" 
                  placeholder="Describe what customers get in this product..."
                  value={prodDesc} 
                  onChange={(e) => setProdDesc(e.target.value)} 
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="bottom-sheet-form-group">
                  <label className="bottom-sheet-label">{t.priceUSD}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="tg-input" 
                    placeholder="9.99"
                    value={prodPriceUSD} 
                    onChange={(e) => setProdPriceUSD(e.target.value)} 
                    required 
                  />
                </div>
                <div className="bottom-sheet-form-group">
                  <label className="bottom-sheet-label">{t.priceStarsLabel}</label>
                  <input 
                    type="number" 
                    className="tg-input" 
                    placeholder={t.calculatedStars}
                    value={prodPriceStars} 
                    onChange={(e) => setProdPriceStars(e.target.value)} 
                  />
                </div>
              </div>

              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">
                  {prodType === 'BOOKING' 
                    ? (lang === 'ru' ? 'Свободные часы (например: Пн 10:00-12:00, Ср 15:00-18:00)' : 'Available Slots (e.g. Mon 10:00-12:00, Wed 15:00-18:00)')
                    : t.fulfillmentUrl}
                </label>
                <input 
                  type="text" 
                  className="tg-input" 
                  placeholder={prodType === 'BOOKING' ? "e.g. Mon 10:00-12:00" : "https://example.com/ebook.pdf"}
                  value={prodUrl} 
                  onChange={(e) => setProdUrl(e.target.value)} 
                  required={prodType === 'BOOKING'}
                />
              </div>

              {prodType === 'BOOKING' && (
                <div className="bottom-sheet-form-group animate-fade-in">
                  <label className="bottom-sheet-label">
                    {lang === 'ru' ? 'Ссылка на Google/Apple Календарь (.ics) [Опционально]' : 'Google/Apple Calendar Link (.ics) [Optional]'}
                  </label>
                  <input 
                    type="text" 
                    className="tg-input" 
                    placeholder="webcal://... or https://...ics"
                    value={prodCalendarIcsUrl} 
                    onChange={(e) => setProdCalendarIcsUrl(e.target.value)} 
                  />
                </div>
              )}

              {prodType === 'VOUCHER' && (
                <div className="bottom-sheet-form-group animate-fade-in">
                  <label className="bottom-sheet-label">
                    {lang === 'ru' ? 'Лимит билетов (Максимум) [Опционально]' : 'Max Ticket Limit [Optional]'}
                  </label>
                  <input 
                    type="number" 
                    className="tg-input" 
                    placeholder="e.g. 50"
                    value={prodMaxQuantity} 
                    onChange={(e) => setProdMaxQuantity(e.target.value)} 
                  />
                </div>
              )}

              {/* Product Cover Image Upload / AI Generation */}
              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">{t.productCover}</label>
                
                {prodCoverUrl && (
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '10px',
                    backgroundImage: `url(${prodCoverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    marginBottom: '10px',
                    position: 'relative'
                  }}>
                    <button
                      type="button"
                      onClick={() => setProdCoverUrl('')}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {isCreatorPremium ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        className="tg-input" 
                        placeholder={t.enterPrompt}
                        value={aiPrompt} 
                        onChange={(e) => setAiPrompt(e.target.value)} 
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: 'auto', padding: '0 16px', background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', whiteSpace: 'nowrap' }}
                        onClick={handleGenerateAICover}
                        disabled={isGeneratingCover || !aiPrompt}
                      >
                        {isGeneratingCover ? t.generating : t.generateAI}
                      </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tg-hint)' }}>
                      — or —
                    </div>
                    <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer' }}>
                      📁 {t.uploadCustom}
                      <input type="file" accept="image/*" onChange={handleProdCoverUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer' }}>
                      📁 {t.uploadCustom}
                      <input type="file" accept="image/*" onChange={handleProdCoverUpload} style={{ display: 'none' }} />
                    </label>
                    
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(255,215,0,0.08)',
                      border: '1px solid rgba(255,215,0,0.2)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      lineHeight: '1.4',
                      color: 'var(--tg-text)'
                    }}>
                      {t.botNotice}
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '14px' }} disabled={isAdding}>
                {isAdding 
                  ? (editingProduct ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : t.addingProduct) 
                  : (editingProduct ? (lang === 'ru' ? 'Сохранить изменения ✓' : 'Save Changes ✓') : t.addProductBtn)
                }
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ─── FOOTER BRANDING (Visible only if not premium) ─── */}
      {!isCreatorPremium && (
        <div 
          onClick={onOpenPremium}
          style={{
            textAlign: 'center', padding: '24px 16px',
            fontSize: '12px', color: 'var(--tg-hint)', opacity: 0.7,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px'
          }}
        >
          <span>{t.poweredBy}</span>
          <span style={{ color: 'var(--tg-accent)', fontWeight: 600 }}>• {t.goPremium}</span>
        </div>
      )}
      {/* ─── BOTTOM SHEET: AI PROMO GENERATOR ─── */}
      <div className={`bottom-sheet-overlay ${isPromoOpen ? 'active' : ''}`} onClick={() => setIsPromoOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsPromoOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <h2 className="bottom-sheet-title">📢 {lang === 'ru' ? 'ИИ Промо-пост' : 'AI Promo Post'}</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.4 }}>
              {lang === 'ru' 
                ? 'Сгенерированный ИИ продающий пост (до 3-х предложений) для публикации в соцсетях или каналах:'
                : 'AI-generated high-converting promo post (max 3 sentences) for sharing on social media or Telegram channels:'}
            </p>
            
            <div style={{
              background: 'var(--tg-secondary-bg)',
              border: '1px solid var(--tg-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              minHeight: '80px',
              fontSize: '14.5px',
              color: 'var(--tg-text)',
              lineHeight: 1.5,
              position: 'relative'
            }}>
              {isGeneratingPromo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--tg-button)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{lang === 'ru' ? 'Генерация...' : 'Generating...'}</span>
                </div>
              ) : (
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{promoText}</p>
              )}
            </div>

            {!isGeneratingPromo && promoText && (
              <button 
                onClick={handleCopyPromo}
                className="btn-primary" 
                style={{ 
                  background: promoCopied ? 'var(--tg-green)' : 'var(--tg-button)',
                  color: 'var(--tg-button-text)'
                }}
              >
                {promoCopied 
                  ? (lang === 'ru' ? '✓ Скопировано!' : '✓ Copied!')
                  : (lang === 'ru' ? '📋 Скопировать пост' : '📋 Copy Post')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM SHEET: PAYMENT SETTINGS ─── */}
      <div className={`bottom-sheet-overlay ${isPaymentSettingsOpen ? 'active' : ''}`} onClick={() => setIsPaymentSettingsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85svh', overflowY: 'auto' }}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsPaymentSettingsOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <h2 className="bottom-sheet-title">💳 {lang === 'ru' ? 'Реквизиты оплаты' : 'Payment Settings'}</h2>
          
          <form onSubmit={handleSavePaymentSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Основной TON кошелек' : 'Default TON Wallet'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="tg-input" 
                  placeholder="UQ..."
                  value={tempTon} 
                  onChange={(e) => setTempTon(e.target.value)} 
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0 12px', whiteSpace: 'nowrap', fontSize: '12px', background: 'var(--tg-accent)' }}
                  onClick={handleConnectWallet}
                >
                  💎 {lang === 'ru' ? 'Подключить Wallet' : 'Connect Wallet'}
                </button>
              </div>
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Основная карта P2P' : 'Default P2P Card'}</label>
              <input 
                type="text" 
                className="tg-input" 
                placeholder="Visa 4321-..."
                value={tempP2p} 
                onChange={(e) => setTempP2p(e.target.value)} 
              />
            </div>

            {/* Premium Section for Multiple Cards / Wallets */}
            {isCreatorPremium ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--tg-border)', paddingTop: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--tg-text)' }}>
                  👑 {lang === 'ru' ? 'Дополнительные источники оплаты' : 'Additional Payment Sources'}
                </h4>
                
                {/* TON Wallets list */}
                <div>
                  <label className="bottom-sheet-label" style={{ fontWeight: 700 }}>
                    {lang === 'ru' ? 'TON кошельки' : 'TON Wallets'} ({tonList.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {tonList.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--tg-secondary-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                        <span><strong>{item.label}:</strong> {item.address.slice(0, 8)}...{item.address.slice(-6)}</span>
                        <button 
                          type="button" 
                          onClick={() => setTonList(tonList.filter(t => t.id !== item.id))}
                          style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add new TON wallet form */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <input 
                      type="text" 
                      placeholder={lang === 'ru' ? 'Название (напр. Tonkeeper)' : 'Label (e.g. Tonkeeper)'} 
                      className="tg-input" 
                      style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }}
                      value={newTonLabel}
                      onChange={(e) => setNewTonLabel(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="UQ..." 
                      className="tg-input" 
                      style={{ flex: 2, fontSize: '12px', padding: '6px 10px' }}
                      value={newTonAddr}
                      onChange={(e) => setNewTonAddr(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '0 12px', fontSize: '12px' }}
                      onClick={() => {
                        if (newTonLabel && newTonAddr) {
                          setTonList([...tonList, { id: 'ton_' + Date.now(), label: newTonLabel, address: newTonAddr }]);
                          setNewTonLabel('');
                          setNewTonAddr('');
                        }
                      }}
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* P2P Cards list */}
                <div>
                  <label className="bottom-sheet-label" style={{ fontWeight: 700 }}>
                    {lang === 'ru' ? 'Карты P2P / Банки' : 'P2P Cards / Banks'} ({p2pList.length})
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {p2pList.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--tg-secondary-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                        <span><strong>{item.label}:</strong> {item.card.slice(0, 16)}...</span>
                        <button 
                          type="button" 
                          onClick={() => setP2pList(p2pList.filter(t => t.id !== item.id))}
                          style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Add new P2P card form */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <input 
                      type="text" 
                      placeholder={lang === 'ru' ? 'Название (напр. Сбербанк)' : 'Label (e.g. Sberbank)'} 
                      className="tg-input" 
                      style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }}
                      value={newP2pLabel}
                      onChange={(e) => setNewP2pLabel(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder={lang === 'ru' ? 'Номер карты и имя' : 'Card details & Name'} 
                      className="tg-input" 
                      style={{ flex: 2, fontSize: '12px', padding: '6px 10px' }}
                      value={newP2pCard}
                      onChange={(e) => setNewP2pCard(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ width: 'auto', padding: '0 12px', fontSize: '12px' }}
                      onClick={() => {
                        if (newP2pLabel && newP2pCard) {
                          setP2pList([...p2pList, { id: 'card_' + Date.now(), label: newP2pLabel, card: newP2pCard }]);
                          setNewP2pLabel('');
                          setNewP2pCard('');
                        }
                      }}
                    >
                      ＋
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: '16px',
                padding: '14px',
                background: 'rgba(255,215,0,0.08)',
                border: '1px dashed rgba(255,215,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#ffd700', margin: 0 }}>
                  👑 PayBio Premium Feature
                </p>
                <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginTop: '4px', lineHeight: 1.4 }}>
                  {lang === 'ru' 
                    ? 'Получите Premium, чтобы добавить реквизиты нескольких карт (Сбербанк, Тинькофф) и TON кошельков.' 
                    : 'Upgrade to Premium to configure multiple cards and TON wallets.'}
                </p>
                <button 
                  type="button"
                  onClick={() => { setIsPaymentSettingsOpen(false); onOpenPremium(); }}
                  className="chip"
                  style={{ 
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', 
                    color: '#000', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '10px', 
                    padding: '2px 8px',
                    marginTop: '8px',
                    fontWeight: 700
                  }}
                >
                  {t.goPremium}
                </button>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ marginTop: '14px' }}>
              {lang === 'ru' ? 'Сохранить настройки ✓' : 'Save Settings ✓'}
            </button>
          </form>
        </div>
      </div>

      {cropperOpen && (
        <ImageCropper
          imageSrc={cropperSrc}
          aspectRatio={cropperAspect}
          circular={cropperCircular}
          onCrop={(cropped) => {
            if (onCropComplete) onCropComplete(cropped);
            setCropperOpen(false);
          }}
          onClose={() => setCropperOpen(false)}
        />
      )}

    </div>
  );
}

// ─── Copy hook ───────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return { copied, copy };
}

// ─── Main Storefront Component ───────────────────────────────────
export default function Storefront() {
  const [productId, setProductId] = useState<string | null>(null);
  const [buyerTgId, setBuyerTgId] = useState<number>(0);
  // null = SDK not yet resolved, number = resolved (0 = no TG user)
  const [creatorTgId, setCreatorTgId] = useState<number | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Language state
  const [lang, setLang] = useState<'en' | 'ru'>('en');

  // Custom shop customization state
  const [creator, setCreator] = useState<Creator | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeAvatar, setStoreAvatar] = useState('');
  const [storeBanner, setStoreBanner] = useState('');
  const [socialLinks, setSocialLinks] = useState({ youtube: '', instagram: '', tiktok: '', vk: '', max: '' });

  // Premium modal state
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'ton' | 'p2p' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Booking states
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [busySlots, setBusySlots] = useState<{ start: string; end: string }[]>([]);
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);

  const [selectedTonIdx, setSelectedTonIdx] = useState(0);
  const [selectedP2pIdx, setSelectedP2pIdx] = useState(0);

  const { copied, copy } = useCopy();

  const t = TRANSLATIONS[lang];

  const handleSelectProduct = useCallback((id: string | null) => {
    setProductId(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('paybio_current_product_id', id);
      } else {
        localStorage.removeItem('paybio_current_product_id');
      }
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('product_id', id);
        url.searchParams.delete('startapp');
        url.searchParams.delete('tgWebAppStartParam');
      } else {
        url.searchParams.delete('product_id');
        url.searchParams.delete('startapp');
        url.searchParams.delete('tgWebAppStartParam');
      }
      window.history.pushState(null, '', url.toString());
    }
  }, []);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const rawPid = urlParams.get('product_id') || urlParams.get('startapp') || urlParams.get('tgWebAppStartParam');
      const pid = cleanProductId(rawPid);
      setProductId(pid);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Telegram native Back Button with productId state
  useEffect(() => {
    import('@twa-dev/sdk').then((twa) => {
      const WebApp = twa.default;
      if (productId) {
        WebApp.BackButton.show();
        const handleBack = () => {
          handleSelectProduct(null);
        };
        WebApp.BackButton.onClick(handleBack);
        return () => {
          WebApp.BackButton.offClick(handleBack);
        };
      } else {
        WebApp.BackButton.hide();
      }
    }).catch(() => {});
  }, [productId, handleSelectProduct]);

  // Init Telegram SDK & URL params & language detection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let rawPid = urlParams.get('startapp')
      || urlParams.get('product_id')
      || urlParams.get('tgWebAppStartParam');
    
    if (!rawPid && typeof window !== 'undefined') {
      rawPid = localStorage.getItem('paybio_current_product_id');
    }
    
    const pid = cleanProductId(rawPid);
    
    if (pid) {
      setProductId(pid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('paybio_current_product_id', pid);
      }
    } else {
      setProductId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paybio_current_product_id');
      }
    }

    const testId = urlParams.get('buyer_tg_id');
    if (testId) setBuyerTgId(Number(testId));

    import('@twa-dev/sdk').then((twa) => {
      const webapp = twa.default;
      webapp.ready();
      webapp.expand();
      try {
        if ('isVerticalSwipesEnabled' in webapp) {
          (webapp as any).isVerticalSwipesEnabled = false;
        }
      } catch (e) {
        console.error('Failed to disable vertical swipes:', e);
      }
      
      // Auto language selection
      const tgLang = webapp.initDataUnsafe?.user?.language_code;
      if (tgLang && tgLang.toLowerCase().startsWith('ru')) {
        setLang('ru');
      } else {
        setLang('en');
      }

      const startParam = webapp.initDataUnsafe?.start_param;
      if (startParam) {
        const cleaned = cleanProductId(startParam);
        setProductId(cleaned);
        if (cleaned) {
          // Sync URL param as well
          const url = new URL(window.location.href);
          url.searchParams.set('product_id', cleaned);
          window.history.replaceState(null, '', url.toString());
        }
      }
      const user = webapp.initDataUnsafe?.user;
      if (user?.id) {
        setBuyerTgId(user.id);
        setCreatorTgId(user.id);
      } else {
        // No TG user (e.g. browser preview) — use URL param or 0
        const urlParams2 = new URLSearchParams(window.location.search);
        const urlCreator = urlParams2.get('creator_tg_id');
        setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
      }
    }).catch(() => {
      // SDK failed — resolve with 0 so loadData can proceed
      const urlParams2 = new URLSearchParams(window.location.search);
      const urlCreator = urlParams2.get('creator_tg_id');
      setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
    });
  }, []);

  const fetchBusySlotsForProduct = async (prodId: string) => {
    setIsLoadingBusySlots(true);
    try {
      const res = await fetch(`/api/calendar/busy?product_id=${prodId}`);
      const data = await res.json();
      if (data.success && data.busySlots) {
        setBusySlots(data.busySlots);
      }
    } catch (e) {
      console.error('Failed to fetch busy slots:', e);
    } finally {
      setIsLoadingBusySlots(false);
    }
  };

  // Fetch data — waits for creatorTgId to be resolved by SDK
  useEffect(() => {
    // Don't fetch until SDK has resolved the creator's TG ID
    if (creatorTgId === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        if (productId) {
          let bTgId = String(buyerTgId);
          let bUsername = '';
          let bName = '';
          if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
            const u = (window as any).Telegram.WebApp.initDataUnsafe.user;
            bTgId = String(u.id);
            bUsername = u.username || '';
            bName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          }
          const res = await fetch(`/api/store/list?product_id=${productId}&buyer_tg_id=${bTgId}&buyer_username=${encodeURIComponent(bUsername)}&buyer_name=${encodeURIComponent(bName)}`, { signal });
          const data = await res.json();
          if (signal.aborted) return;
          if (data.success && data.product) {
            setProduct(data.product);
            if (data.product.creator) {
              setCreator(data.product.creator);
            }
            if (data.product.product_type === 'BOOKING') {
              fetchBusySlotsForProduct(data.product.id);
            }
          } else {
            setError(data.error || 'Product not found.');
          }
        } else {
          // Use the resolved creatorTgId — no guessing, no fallback to fake IDs
          const urlParams = new URLSearchParams(window.location.search);
          const cTgId = urlParams.get('creator_tg_id') || String(creatorTgId);

          const res = await fetch(`/api/store/list?creator_tg_id=${cTgId}`, { signal });
          const data = await res.json();
          if (signal.aborted) return;
          if (data.success) {
            setProductsList(data.products || []);
            if (data.creator) setCreator(data.creator);
          } else {
            setError(data.error || 'Failed to load products.');
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Network error');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    loadData();
    return () => controller.abort();
  }, [productId, creatorTgId]);

  // Load custom shop customization settings from creator.profile_customization first
  useEffect(() => {
    if (creator) {
      const pc = creator.profile_customization || {};
      const savedName = pc.store_name || localStorage.getItem(`paybio_name_${creator.id}`);
      const savedDesc = pc.store_description || localStorage.getItem(`paybio_desc_${creator.id}`);
      const savedAvatar = pc.avatar_url || localStorage.getItem(`paybio_avatar_${creator.id}`);
      const savedBanner = pc.banner_url || localStorage.getItem(`paybio_banner_${creator.id}`);
      let savedSocials = pc.social_links;
      if (!savedSocials) {
        const savedSocialsStr = localStorage.getItem(`paybio_socials_${creator.id}`);
        if (savedSocialsStr) {
          try {
            savedSocials = JSON.parse(savedSocialsStr);
          } catch (e) {}
        }
      }

      setStoreName(savedName || creator.username || `User #${creator.telegram_id}`);
      setStoreDescription(savedDesc || (lang === 'ru' 
        ? 'Добро пожаловать в мой цифровой магазин. Выберите любой товар ниже, чтобы открыть его, оплатить через Stars/TON/Карту и мгновенно получить файл.' 
        : 'Welcome to my digital storefront. Tap any product below to view storefront, pay via Stars/TON/Card, and get instant file delivery.'));
      setStoreAvatar(savedAvatar || '');
      setStoreBanner(savedBanner || '');
      if (savedSocials) {
        setSocialLinks({
          youtube: savedSocials.youtube || '',
          instagram: savedSocials.instagram || '',
          tiktok: savedSocials.tiktok || '',
          vk: savedSocials.vk || '',
          max: savedSocials.max || '',
        });
      } else {
        setSocialLinks({ youtube: '', instagram: '', tiktok: '', vk: '', max: '' });
      }
    }
  }, [creator, lang]);

  // Premium activation
  const handleActivatePremium = async () => {
    if (!creator) return;
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/store/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, is_premium: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreator((prev) => prev ? { ...prev, is_premium: true } : null);
        setIsPremiumOpen(false);
        showAlert(t.premiumUnlocked);
      } else {
        showAlert(data.error || 'Failed to activate Premium.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error processing upgrade.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Direct product creation in frontend
  const handleAddProduct = async (
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType = 'DIGITAL'
  ): Promise<boolean> => {
    // If creator not loaded yet — try to fetch it now using resolved TG ID
    let activeCreator = creator;
    if (!activeCreator && creatorTgId) {
      try {
        const r = await fetch(`/api/store/list?creator_tg_id=${creatorTgId}`);
        const d = await r.json();
        if (d.success && d.creator) {
          setCreator(d.creator);
          activeCreator = d.creator;
        }
      } catch {/* ignore */}
    }
    if (!activeCreator) {
      showAlert(lang === 'ru' ? 'Профиль не загружен. Попробуйте перезапустить приложение.' : 'Profile not loaded. Please restart the app.');
      return false;
    }
    try {
      const res = await fetch('/api/store/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: activeCreator.id,
          title,
          description,
          price_fiat: priceFiat,
          price_stars: priceStars,
          content_url: contentUrl,
          cover_url: coverUrl,
          product_type: productType
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList((prev) => [...prev, data.product]);
        showAlert(lang === 'ru' ? '🎉 Товар успешно добавлен!' : '🎉 Product added successfully!');
        return true;
      } else {
        showAlert(data.error || 'Failed to add product.');
        return false;
      }
    } catch (err: any) {
      showAlert(err.message || 'Error creating product.');
      return false;
    }
  };

  const handleDeleteProduct = async (prodId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/store/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: prodId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList((prev) => prev.filter((p) => p.id !== prodId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to delete product:', err);
      return false;
    }
  };

  const handleUpdateProduct = async (
    prodId: string,
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/store/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: prodId,
          title,
          description,
          price_fiat: priceFiat,
          price_stars: priceStars,
          content_url: contentUrl,
          cover_url: coverUrl,
          product_type: productType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList((prev) => prev.map((p) => p.id === prodId ? { ...p, ...data.product } : p));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update product:', err);
      return false;
    }
  };

  // Stars payment
  const handleStarsPayment = async () => {
    if (!product) return;
    if (product.product_type === 'BOOKING') {
      if (!bookingDate || !bookingTime) {
        showAlert(lang === 'ru' ? 'Пожалуйста, выберите дату и время записи.' : 'Please select date and time for the booking.');
        return;
      }
    }
    try {
      const bookingSlot = product.product_type === 'BOOKING' ? {
        start: `${bookingDate}T${bookingTime}:00`,
        end: `${bookingDate}T${bookingTime}:00`
      } : undefined;

      const res = await fetch('/api/checkout/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, buyer_tg_id: buyerTgId, booking_slot: bookingSlot }),
      });
      const data = await res.json();
      if (!res.ok) { showAlert(data.error || 'Failed to create invoice.'); return; }

      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.openInvoice(data.invoice_link, (status) => {
        if (status === 'paid') showAlert(t.fileDelivered);
        else showAlert(`Payment status: ${status}`);
      });
    } catch (e: any) {
      showAlert('Error initiating payment.');
    }
  };

  const handleBuyDirect = async () => {
    if (!product) return;
    const creatorUsername = product.creator?.username;
    const contactUrl = creatorUsername 
      ? `https://t.me/${creatorUsername}`
      : `tg://user?id=${product.creator?.telegram_id}`;
    
    const text = lang === 'ru'
      ? `Привет! Я хочу купить твой товар: "${product.title}"`
      : `Hi! I want to buy your product: "${product.title}"`;
      
    try {
      const WebApp = (await import('@twa-dev/sdk')).default;
      navigator.clipboard.writeText(text).then(() => {
        showAlert(lang === 'ru' 
          ? 'Сообщение скопировано! Открываем диалог с автором.' 
          : 'Message copied! Opening chat with the creator.');
      }).catch(() => {});
      
      setTimeout(() => {
        WebApp.openTelegramLink(contactUrl);
      }, 1200);
    } catch (e) {
      window.open(contactUrl, '_blank');
    }
  };

  // P2P verification
  const handleVerifyReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !file) return;
    if (product.product_type === 'BOOKING') {
      if (!bookingDate || !bookingTime) {
        showAlert(lang === 'ru' ? 'Пожалуйста, выберите дату и время записи.' : 'Please select date and time for the booking.');
        return;
      }
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(false);
    setExtractedData(null);
    setVerifyStep(1);

    let orderId = '';
    try {
      const bookingSlot = product.product_type === 'BOOKING' ? {
        start: `${bookingDate}T${bookingTime}:00`,
        end: `${bookingDate}T${bookingTime}:00`
      } : undefined;

      const orderRes = await fetch('/api/checkout/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, buyer_tg_id: buyerTgId, booking_slot: bookingSlot }),
      });
      const orderData = await orderRes.json();
      orderId = orderData.order_id;
    } catch {
      setVerifyError('Failed to initialize order.');
      setVerifying(false);
      return;
    }

    setTimeout(() => setVerifyStep(2), 1500);
    setTimeout(() => setVerifyStep(3), 3000);
    setTimeout(async () => {
      setVerifyStep(4);
      try {
        const form = new FormData();
        form.append('order_id', orderId);
        form.append('file', file);
        const res = await fetch('/api/checkout/verify', { method: 'POST', body: form });
        const result = await res.json();
        if (res.ok && result.success) {
          setVerifySuccess(true);
          setExtractedData(result.extracted_data);
        } else {
          setVerifyError(result.reason || 'Verification failed. Mismatched amount or edited receipt.');
        }
      } catch (err: any) {
        setVerifyError(err.message || 'Processing error.');
      } finally {
        setVerifying(false);
      }
    }, 4500);
  };

  const isOwner = creator && Number(buyerTgId) === Number(creator.telegram_id);

  // ─── Render logic ────────────────────────────────────────────
  if (loading) return <LoadingScreen lang={lang} />;
  if (!productId) {
    return (
      <>
        <ProductListScreen 
          products={productsList} 
          onSelect={handleSelectProduct} 
          creator={creator}
          storeName={storeName}
          setStoreName={setStoreName}
          storeDescription={storeDescription}
          setStoreDescription={setStoreDescription}
          storeAvatar={storeAvatar}
          setStoreAvatar={setStoreAvatar}
          storeBanner={storeBanner}
          setStoreBanner={setStoreBanner}
          socialLinks={socialLinks}
          setSocialLinks={setSocialLinks}
          onAddProduct={handleAddProduct}
          onOpenPremium={() => setIsPremiumOpen(true)}
          lang={lang}
          setLang={setLang}
          isOwner={!!isOwner}
          onDeleteProduct={handleDeleteProduct}
          onUpdateProduct={handleUpdateProduct}
        />
        
        {/* Premium dialog bottom sheet */}
        <div className={`bottom-sheet-overlay ${isPremiumOpen ? 'active' : ''}`} onClick={() => setIsPremiumOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <button 
              type="button" 
              onClick={() => setIsPremiumOpen(false)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
              }}
            >
              ✕
            </button>
            
            {/* Header / Graphic icon */}
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', margin: '0 auto 16px',
              boxShadow: '0 4px 16px rgba(255, 215, 0, 0.3)'
            }}>
              👑
            </div>
            
            <h2 className="bottom-sheet-title" style={{ marginBottom: '6px' }}>{t.premiumTitle}</h2>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tg-hint)', marginBottom: '24px' }}>
              {t.premiumSub}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>{t.premiumStatusBadge}</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', marginTop: '2px' }}>{t.premiumStatusBadgeDesc}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>🚫</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>{t.removeBrandingLogo}</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', marginTop: '2px' }}>{t.removeBrandingLogoDesc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>🔓</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>{t.unlimitedTransactions}</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', marginTop: '2px' }}>{t.unlimitedTransactionsDesc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>🔓</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>🤖 AI Cover Generator</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', marginTop: '2px' }}>{lang === 'ru' ? 'Создавайте обложки для товаров по описанию с помощью ИИ FLUX.' : 'Create product covers from description using FLUX AI.'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>📈</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tg-text)' }}>{t.advancedInsights}</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--tg-hint)', marginTop: '2px' }}>{t.advancedInsightsDesc}</p>
                </div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000' }}
              onClick={handleActivatePremium}
              disabled={isUpgrading}
            >
              {isUpgrading ? t.activating : t.activatePremiumFor}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (error || !product) return (
    <ErrorScreen message={error || 'This storefront no longer exists.'} onBack={() => setProductId(null)} lang={lang} />
  );

  const isStorePremium = product.creator?.is_premium;

  let slotsText = product.content_url || '';
  let maxQuantity: number | null = null;
  let fulfillmentUrl = product.content_url || '';
  let hasLimit = false;

  if (product.product_type === 'BOOKING' || product.product_type === 'VOUCHER') {
    try {
      const parsed = JSON.parse(product.content_url);
      if (parsed) {
        if (product.product_type === 'BOOKING') {
          slotsText = parsed.slots || '';
        } else if (product.product_type === 'VOUCHER') {
          fulfillmentUrl = parsed.fulfillment_url || '';
          if (typeof parsed.max_quantity === 'number') {
            maxQuantity = parsed.max_quantity;
            hasLimit = true;
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors for legacy data
    }
  }

  const isSoldOut = product.product_type === 'VOUCHER' && hasLimit && (product.sold_count || 0) >= (maxQuantity || 0);

  const hasBookingConflict = !!(product.product_type === 'BOOKING' && bookingDate && bookingTime && busySlots.some((slot) => {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    const selStart = new Date(`${bookingDate}T${bookingTime}:00`).getTime();
    const selEnd = selStart + 60 * 60 * 1000;
    return selStart < end && selEnd > start;
  }));

  const tonList = isStorePremium && product.creator?.payment_details?.ton_list || [];
  const p2pList = isStorePremium && product.creator?.payment_details?.p2p_list || [];

  const tonDetails = tonList.length > 0 && selectedTonIdx < tonList.length
    ? tonList[selectedTonIdx].address 
    : (product.creator?.payment_details?.ton || 'No TON wallet configured');
    
  const p2pDetails = p2pList.length > 0 && selectedP2pIdx < p2pList.length
    ? p2pList[selectedP2pIdx].card 
    : (product.creator?.payment_details?.p2p || 'No card details configured');

  const tonAmount = (product.price_fiat / 7.0).toFixed(2);

  const STEPS = lang === 'ru' ? [
    'Анализ метаданных и тегов квитанции',
    'EXIF сканирование (проверка фотошопа)',
    'Распознавание Vision AI · OCR данных',
    'Сверка суммы и выдача файла',
  ] : [
    'Parsing receipt metadata & tags',
    'EXIF fraud scan (Photoshop detection)',
    'Vision AI · OCR data extraction',
    'Amount reconciliation & fulfillment',
  ];

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--tg-bg)',
      display: 'flex', flexDirection: 'column',
    }} className="animate-fade-in">

      {/* Top sticky navigation bar for buyer page */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--tg-secondary-bg)',
        borderBottom: '1px solid var(--tg-border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(10px)'
      }}>
        <button 
          onClick={() => handleSelectProduct(null)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tg-link)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          ← {lang === 'ru' ? 'Назад в каталог' : 'Back to Catalog'}
        </button>
        <span style={{ fontSize: '13px', color: 'var(--tg-hint)', fontWeight: 500 }}>
          PayBio
        </span>
      </div>

      {/* ── PRODUCT HERO ── */}
      <div style={{
        background: 'var(--tg-secondary-bg)',
        borderBottom: '1px solid var(--tg-border)',
        padding: '20px 16px 24px',
      }}>
        {/* Creator row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '20px',
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'var(--tg-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '12px', color: '#fff',
          }}>
            {(product.creator?.username || 'PB').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 500 }}>
              {lang === 'ru' ? 'Магазин автора' : 'Storefront by'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tg-text)' }}>
                @{product.creator?.username || 'creator'}
              </p>
              {isStorePremium && (
                <span style={{ fontSize: '12px' }} title="Premium Creator">👑</span>
              )}
            </div>
          </div>
          <span className="chip chip-blue" style={{ marginLeft: 'auto' }}>
            ✓ Verified
          </span>
        </div>

        {/* Category-Specific Storefront Product Layout */}
        {product.product_type === 'VOUCHER' ? (
          /* ── VOUCHER / TICKET CATEGORY LAYOUT (TICKET STUB) ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid var(--tg-border)',
          }}>
            {/* Ticket Notches */}
            <div className="ticket-notch-left" />
            <div className="ticket-notch-right" />

            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url(${product.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(248,113,113,0.1)'
                }}>
                  🎟️
                </div>
              )}
              
              <span className="chip" style={{ marginBottom: '14px', display: 'inline-flex', background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                {lang === 'ru' ? '🎟️ Билет / Ваучер' : '🎟️ Ticket / Voucher'}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>
              
              <p style={{
                marginTop: '10px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>

              {/* Dotted separator for ticket stub effect */}
              <div style={{
                borderTop: '2px dashed var(--tg-border)',
                margin: '18px 0',
                position: 'relative'
              }} />

              <div style={{
                padding: '10px 12px',
                background: 'rgba(248,113,113,0.06)', borderRadius: '10px',
                border: '1.5px dashed rgba(248,113,113,0.2)',
                fontSize: '11.5px', color: 'var(--tg-text)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>🎟️</span>
                <span>
                  {lang === 'ru' 
                    ? 'После покупки билет появится в вашем кабинете. Предъявите его QR-код на входе.' 
                    : 'Your e-ticket with a secure QR code will be generated immediately after payment.'}
                </span>
              </div>
            </div>
          </div>
        ) : product.product_type === 'BOOKING' ? (
          /* ── BOOKING / CALENDAR CATEGORY LAYOUT ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid var(--tg-border)'
          }}>
            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url(${product.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.2)',
                  color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(56,189,248,0.1)'
                }}>
                  📅
                </div>
              )}
              
              <span className="chip" style={{ marginBottom: '14px', display: 'inline-flex', background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                {lang === 'ru' ? '📅 Запись / Консультация' : '📅 Booking / Consultation'}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>
              
              <p style={{
                marginTop: '10px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>

              <div style={{
                marginTop: '16px', padding: '10px 12px',
                background: 'rgba(56,189,248,0.06)', borderRadius: '10px',
                border: '1.5px dashed rgba(56,189,248,0.2)',
                fontSize: '11.5px', color: 'var(--tg-text)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>🕒</span>
                <span>
                  {lang === 'ru' 
                    ? 'Выберите свободную дату и время перед совершением оплаты.' 
                    : 'Select your preferred date and slot from the menu below before paying.'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ── DIGITAL DELIVERY LAYOUT (DEFAULT) ── */
          <div style={{
            background: 'var(--tg-surface)',
            borderRadius: '16px',
            padding: product.cover_url ? '0 0 20px 0' : '24px 20px',
            textAlign: 'center',
            marginBottom: '20px',
            position: 'relative', overflow: 'hidden',
            border: '1px solid var(--tg-border)'
          }}>
            {product.cover_url && (
              <div style={{
                width: '100%',
                height: '180px',
                backgroundImage: `url(${product.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '60px',
                  background: 'linear-gradient(to top, var(--tg-surface), transparent)'
                }} />
              </div>
            )}
            
            <div style={{ padding: product.cover_url ? '0 20px' : '0' }}>
              {!product.cover_url && (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)',
                  color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 16px',
                  boxShadow: '0 4px 12px rgba(96,165,250,0.1)'
                }}>
                  💾
                </div>
              )}
              
              <span className="chip chip-blue" style={{ marginBottom: '14px', display: 'inline-flex' }}>
                {t.digitalProduct}
              </span>
              
              <h1 style={{
                fontSize: '22px', fontWeight: 800,
                color: 'var(--tg-text)', lineHeight: 1.3,
                letterSpacing: '-0.3px',
              }}>
                {product.title}
              </h1>
              
              <p style={{
                marginTop: '10px', fontSize: '13px',
                color: 'var(--tg-hint)', lineHeight: 1.6,
              }}>
                {product.description}
              </p>

              <div style={{
                marginTop: '16px', padding: '10px 12px',
                background: 'rgba(96,165,250,0.06)', borderRadius: '10px',
                border: '1.5px dashed rgba(96,165,250,0.2)',
                fontSize: '11.5px', color: 'var(--tg-text)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <span>
                  {lang === 'ru' 
                    ? 'Мгновенная выдача! Ссылку или файл вы получите сразу же после завершения платежа.' 
                    : 'Instant access! File downloads or access links are provided right after checkout.'}
                </span>
              </div>
            </div>
          </div>
        )}

            {product.product_type === 'VOUCHER' && hasLimit && (
              <div style={{ margin: '0 0 16px 0', padding: '12px 16px', background: 'var(--tg-surface)', borderRadius: '14px', border: '1px solid var(--tg-border)', display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--tg-hint)' }}>
                    {lang === 'ru' ? 'Доступно билетов:' : 'Tickets available:'}
                  </span>
                  <span style={{ color: (product.sold_count || 0) >= (maxQuantity || 0) ? 'var(--tg-red)' : 'var(--tg-text)' }}>
                    {Math.max(0, (maxQuantity || 0) - (product.sold_count || 0))} / {maxQuantity}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--tg-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, ((product.sold_count || 0) / (maxQuantity || 1)) * 100)}%`,
                    height: '100%',
                    background: (product.sold_count || 0) >= (maxQuantity || 0) 
                      ? 'var(--tg-red)' 
                      : (maxQuantity || 0) - (product.sold_count || 0) <= 5 
                      ? 'linear-gradient(90deg, #f48020, #e95c5c)' 
                      : 'var(--tg-accent)',
                    borderRadius: '3px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                {(maxQuantity || 0) - (product.sold_count || 0) <= 5 && (maxQuantity || 0) - (product.sold_count || 0) > 0 && (
                  <p style={{ fontSize: '11px', color: '#e95c5c', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }} className="animate-pulse-soft">
                    <span>🔥</span> {lang === 'ru' ? 'Почти все раскуплено! Спешите!' : 'Almost sold out! Hurry up!'}
                  </p>
                )}
              </div>
            )}

            {product.product_type === 'BOOKING' && (
              <BookingCalendar
                slotsText={slotsText}
                busySlots={busySlots}
                bookingDate={bookingDate}
                setBookingDate={setBookingDate}
                bookingTime={bookingTime}
                setBookingTime={setBookingTime}
                lang={lang}
              />
            )}

            {/* Price row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--tg-surface)',
          borderRadius: '14px',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginBottom: '3px' }}>{t.price}</p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.5px' }}>
              ${product.price_fiat}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span className="chip chip-blue">{product.price_stars} ⭐ {t.stars}</span>
            <span className="chip chip-hint">~{tonAmount} TON</span>
          </div>
        </div>
      </div>

      {/* ── PAYMENT SECTION ── */}
      <div style={{ flex: 1, padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {isSoldOut ? (
          <div style={{ textAlign: 'center', padding: '24px', background: 'var(--tg-surface)', borderRadius: '14px', border: '1px solid var(--tg-border)' }} className="animate-scale-in">
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎟️</div>
            <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--tg-text)', margin: 0 }}>
              {lang === 'ru' ? 'Все билеты распроданы!' : 'All tickets are sold out!'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--tg-hint)', marginTop: '4px', marginBottom: 0 }}>
              {lang === 'ru' ? 'Следите за новыми предложениями автора.' : 'Stay tuned for new offers from the creator.'}
            </p>
          </div>
        ) : isStorePremium ? (
          <>
            {/* Payment method selector */}
            <div>
              <p className="section-header">{t.choosePayment}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>

                {/* Stars */}
                <button
                  className={`pay-btn ${paymentMethod === 'stars' ? 'active-stars' : ''}`}
                  onClick={() => setPaymentMethod('stars')}
                >
                  <div className="pay-btn-icon">⭐️</div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: paymentMethod === 'stars' ? 'var(--tg-link)' : 'var(--tg-hint)' }}>
                    {lang === 'ru' ? 'Звёзды' : 'Stars'}
                  </span>
                </button>

                {/* TON */}
                <button
                  className={`pay-btn ${paymentMethod === 'ton' ? 'active-ton' : ''}`}
                  onClick={() => setPaymentMethod('ton')}
                >
                  <div className="pay-btn-icon">💎</div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: paymentMethod === 'ton' ? 'var(--tg-green)' : 'var(--tg-hint)' }}>
                    TON
                  </span>
                </button>

                {/* P2P */}
                <button
                  className={`pay-btn ${paymentMethod === 'p2p' ? 'active-p2p' : ''}`}
                  onClick={() => setPaymentMethod('p2p')}
                >
                  <div className="pay-btn-icon">💳</div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: paymentMethod === 'p2p' ? 'var(--tg-orange)' : 'var(--tg-hint)' }}>
                    {lang === 'ru' ? 'Карта' : 'Card'}
                  </span>
                </button>
              </div>
            </div>

        {/* ── STARS PANEL ── */}
        {paymentMethod === 'stars' && (
          <div className="tg-card animate-fade-up" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div className="pay-btn-icon">⭐️</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>{t.starsTitle}</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{t.starsSub}</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.6, marginBottom: '16px' }}>
              {t.starsDesc}
            </p>
            <button 
              className="btn-primary" 
              onClick={handleStarsPayment} 
              disabled={hasBookingConflict}
              style={{ background: hasBookingConflict ? 'var(--tg-hint)' : 'var(--tg-accent)' }}
            >
              {t.payStars.replace('{stars}', String(product.price_stars))}
            </button>
          </div>
        )}

        {/* ── TON PANEL ── */}
        {paymentMethod === 'ton' && (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pay-btn-icon">💎</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>{t.tonTitle}</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{t.tonSub}</p>
              </div>
            </div>

            {tonList.length > 1 && (
              <div style={{ marginTop: '10px' }}>
                <p className="section-header" style={{ marginBottom: '8px' }}>{lang === 'ru' ? 'Выберите кошелек' : 'Select Wallet'}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {tonList.map((item: any, idx: number) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedTonIdx(idx)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: selectedTonIdx === idx ? '1.5px solid var(--tg-green)' : '1px solid var(--tg-border)',
                        background: selectedTonIdx === idx ? 'rgba(56,239,125,0.1)' : 'transparent',
                        color: 'var(--tg-text)',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tg-divider" />

            <div>
              <p className="section-header" style={{ marginBottom: '8px' }}>{t.walletAddress}</p>
              <div className="copy-block">
                <span className="copy-value">{tonDetails}</span>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(tonDetails)}>
                  {copied ? (lang === 'ru' ? '✓ Скопировано' : '✓ Copied') : (lang === 'ru' ? 'Копировать' : 'Copy')}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', background: 'var(--tg-bg)', borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>{t.amountToSend}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tg-text)' }}>
                {tonAmount} TON
              </span>
            </div>

            <a
              href={`ton://transfer/${tonDetails}?amount=${Math.round(Number(tonAmount) * 1e9)}`}
              className="btn-primary"
              style={{ background: 'var(--tg-green)', textDecoration: 'none' }}
            >
              {t.openInTon}
            </a>
          </div>
        )}

        {/* ── P2P PANEL ── */}
        {paymentMethod === 'p2p' && (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pay-btn-icon">💳</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>{t.cardTitle}</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{t.cardSub}</p>
              </div>
              <span className="chip chip-green" style={{ marginLeft: 'auto' }}>AI</span>
            </div>

            {p2pList.length > 1 && (
              <div style={{ marginTop: '10px' }}>
                <p className="section-header" style={{ marginBottom: '8px' }}>{lang === 'ru' ? 'Выберите карту/источник' : 'Select Card/Source'}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {p2pList.map((item: any, idx: number) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedP2pIdx(idx)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: selectedP2pIdx === idx ? '1.5px solid var(--tg-orange)' : '1px solid var(--tg-border)',
                        background: selectedP2pIdx === idx ? 'rgba(255,165,0,0.1)' : 'transparent',
                        color: 'var(--tg-text)',
                        cursor: 'pointer'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tg-divider" />

            {/* Card details */}
            <div>
              <p className="section-header" style={{ marginBottom: '8px' }}>{t.sellerCard}</p>
              <div className="copy-block">
                <span className="copy-value">{p2pDetails}</span>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(p2pDetails)}>
                  {copied ? '✓' : (lang === 'ru' ? 'Коп.' : 'Copy')}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--tg-bg)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.6,
            }}>
              {t.transferInstruct.replace('${price}', String(product.price_fiat))}
            </div>

            {/* Receipt upload / verifying / done */}
            {!verifying && !verifySuccess && (
              <form onSubmit={handleVerifyReceipt} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label
                  className={`upload-zone ${file ? 'has-file' : ''}`}
                  htmlFor="receipt-upload"
                >
                  <input
                    id="receipt-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                    required
                  />
                  {file ? (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tg-text)' }}>{file.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginTop: '4px' }}>
                        {lang === 'ru' ? 'Нажмите, чтобы изменить' : 'Tap to change file'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tg-hint)' }}>
                        {t.uploadReceipt}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginTop: '4px', opacity: 0.6 }}>
                        {t.jpegPng}
                      </p>
                    </>
                  )}
                </label>

                <button type="submit" className="btn-primary" disabled={!file || hasBookingConflict}
                  style={{ background: (file && !hasBookingConflict) ? 'var(--tg-accent)' : undefined }}
                >
                  {t.verifyGetFile}
                </button>

                {verifyError && (
                  <div style={{
                    padding: '12px 14px',
                    background: 'rgba(233,92,92,0.1)',
                    border: '1px solid rgba(233,92,92,0.2)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px', color: 'var(--tg-red)',
                  }} className="animate-scale-in">
                    ❌ {verifyError}
                    <button
                      type="button"
                      onClick={() => setVerifyError(null)}
                      style={{ marginLeft: '8px', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '12px' }}
                    >
                      {lang === 'ru' ? 'Повторить' : 'Retry'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* AI pipeline progress */}
            {verifying && (
              <div style={{
                padding: '16px',
                background: 'var(--tg-bg)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }} className="animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tg-accent)' }} className="animate-pulse-soft">
                    {t.aiPipeline}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>
                    {verifyStep} / 4
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ height: '3px', background: 'var(--tg-secondary-bg)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(verifyStep / 4) * 100}%`,
                    background: 'var(--tg-accent)',
                    borderRadius: '999px',
                    transition: 'width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }} />
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {STEPS.map((label, i) => {
                    const step = i + 1;
                    const isDone = verifyStep > step;
                    const isActive = verifyStep === step;
                    return (
                      <div
                        key={i}
                        className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                      >
                        <div className="step-dot">
                          {isDone ? '✓' : step}
                        </div>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Success */}
            {verifySuccess && (
              <div style={{
                padding: '20px',
                background: 'rgba(77,202,90,0.08)',
                border: '1px solid rgba(77,202,90,0.2)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }} className="animate-scale-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--tg-green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px',
                  }}>✓</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--tg-green)' }}>
                      {t.paymentApproved}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>
                      {t.fileDelivered}
                    </p>
                  </div>
                </div>
                {extractedData && (
                  <div style={{
                    padding: '12px', background: 'var(--tg-bg)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px', fontFamily: 'monospace',
                    color: 'var(--tg-hint)',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                  }}>
                    <p><span style={{ color: 'var(--tg-text)' }}>{lang === 'ru' ? 'Сумма:' : 'Amount:'}</span> ${extractedData.amount}</p>
                    <p><span style={{ color: 'var(--tg-text)' }}>{lang === 'ru' ? 'Получатель:' : 'Receiver:'}</span> {extractedData.receiver_name || '—'}</p>
                    <p><span style={{ color: 'var(--tg-text)' }}>{lang === 'ru' ? 'Дата:' : 'Date:'}</span> {extractedData.transaction_date || '—'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </>
    ) : (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--tg-text)', margin: 0 }}>
              {lang === 'ru' ? 'Прямая покупка' : 'Direct Purchase'}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.6, margin: 0 }}>
              {lang === 'ru' 
                ? 'Этот автор использует бесплатную версию магазина. Нажмите кнопку ниже, чтобы открыть чат с автором напрямую и договориться об оплате.'
                : 'This creator is using the free version of PayBio. Click below to contact the creator directly and arrange payment.'}
            </p>
            <button className="btn-primary" onClick={handleBuyDirect} style={{ background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)', color: '#fff', fontWeight: 700 }}>
              💬 {lang === 'ru' ? 'Связаться и Купить' : 'Contact & Buy'}
            </button>
          </div>
        )}
      </div>

      {/* Back button */}
      <div style={{ padding: '0 16px 12px' }}>
        <button className="btn-secondary" onClick={() => handleSelectProduct(null)}>
          {t.backToCatalog}
        </button>
      </div>

      {/* Footer Branding (Hidden if Premium) */}
      {!isStorePremium && (
        <div style={{
          textAlign: 'center', padding: '12px 16px 24px',
          fontSize: '11px', color: 'var(--tg-hint)', opacity: 0.5,
        }}>
          {t.poweredBy}
        </div>
      )}
    </div>
  );
}
