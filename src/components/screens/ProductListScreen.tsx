'use client';

import React, { useState, useMemo, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import { YoutubeIcon, InstagramIcon, TiktokIcon, VkIcon, MaxIcon } from '@/components/Icons';
import ProductCard from '@/components/ProductCard';
import { Creator, Product } from '@/types/store';
import { getTWA, showAlert, handleOpenLink } from '@/utils/telegram';
import { TRANSLATIONS } from '@/lib/translations';

// Heavy components — loaded only when needed
const ImageCropper = dynamic(() => import('@/components/ImageCropper'), { ssr: false });
const SettingsView = dynamic(() => import('@/components/SettingsView'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />,
});
const ReviewsDashboard = dynamic(() => import('@/components/ReviewsDashboard'), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 150, borderRadius: 14 }} />,
});
const PartnerDashboard = dynamic(() => import('@/components/PartnerDashboard'), { ssr: false });

const getDaysWord = (days: number, lang: 'ru' | 'en') => {
  if (lang === 'en') return days === 1 ? 'day' : 'days';
  const mod10 = days % 10;
  const mod100 = days % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
};

const getProductSection = (sections: Record<string, string>, id: string): string | undefined => {
  if (!id) return undefined;
  const match = Object.entries(sections).find(([k]) => k === id);
  return match ? match[1] : undefined;
};

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
  onAddProduct: (title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string, section?: string, subType?: string) => Promise<boolean>;
  onOpenPremium: () => void;
  lang: 'en' | 'ru';
  setLang: (lang: 'en' | 'ru') => void;
  isOwner: boolean;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onUpdateProduct: (id: string, title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string, section?: string, subType?: string) => Promise<boolean>;

  currentScreen: 'CATALOG' | 'SETTINGS' | 'PARTNER';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS' | 'PARTNER') => void;
  starredIds: string[];
  setStarredIds: (ids: string[]) => void;
  sectionsList: string[];
  setSectionsList: (list: string[]) => void;
  sectionOrder: string[];
  setSectionOrder: (order: string[]) => void;
  productSections: Record<string, string>;
  setProductSections: (sections: Record<string, string>) => void;
  onSaveSettings: (name: string, description: string, avatar: string, banner: string, socials: any, ton: string, p2p: string, p2pList: any[], calendarProvider: string, icsUrl: string, usdtTrc20?: string, usdtBep20?: string, other?: string) => Promise<void>;
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
  onTriggerOnboarding?: () => void;
  setCreator: (creator: Creator | null | ((prev: Creator | null) => Creator | null)) => void;
}

export const ProductListScreen = memo(function ProductListScreen({
  products,
  onSelect,
  creator,
  setCreator,
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
  onUpdateProduct,

  currentScreen,
  setCurrentScreen,
  starredIds,
  setStarredIds,
  sectionsList,
  setSectionsList,
  sectionOrder,
  setSectionOrder,
  productSections,
  setProductSections,
  onSaveSettings,
  busySlots,
  dbBookings,
  fetchBusySlotsForProduct,
  buyerTgId,
  onTriggerOnboarding
}: ProductListScreenProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditSocialsOpen, setIsEditSocialsOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creationStep, setCreationStep] = useState<'TYPE_SELECT' | 'FORM'>('TYPE_SELECT');
  const [isBioLinkExpanded, setIsBioLinkExpanded] = useState(false);
  const [isShareEarnExpanded, setIsShareEarnExpanded] = useState(false);

  const isCreatorPremium = !!creator?.is_premium;
  const hasSocials = !!(socialLinks.youtube || socialLinks.instagram || socialLinks.tiktok || socialLinks.vk || socialLinks.max);

  const [activeTab, setActiveTab] = useState<'catalog' | 'reviews'>('catalog');
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const [selectedProductSection, setSelectedProductSection] = useState('DIGITAL');

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdTitle(p.title);
    setProdDesc(p.description || '');
    setProdPriceUSD(String(p.price_fiat));
    setProdPriceStars(p.price_stars ? String(p.price_stars) : String(Math.round(p.price_fiat * 50)));
    setProdCoverUrl(p.cover_url || '');
    setProdType(p.product_type || 'DIGITAL');
    setProdSubType(p.sub_type || '');
    setSelectedProductSection(getProductSection(productSections, p.id) || p.product_type || 'DIGITAL');

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

  const handleOpenCreateProduct = (defaultSection = 'DIGITAL') => {
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
    setProdType(defaultSection === 'BOOKING' ? 'BOOKING' : defaultSection === 'VOUCHER' ? 'VOUCHER' : 'DIGITAL');
    setProdSubType('');
    setSelectedProductSection(defaultSection);
    setCreationStep('TYPE_SELECT');
    setIsAddProductOpen(true);
  };

  // Add product form state
  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPriceUSD, setProdPriceUSD] = useState('');
  const [prodPriceStars, setProdPriceStars] = useState('');
  const [prodUrl, setProdUrl] = useState('');
  const [prodCalendarIcsUrl, setProdCalendarIcsUrl] = useState('');
  const [prodMaxQuantity, setProdMaxQuantity] = useState('');
  const [prodSubType, setProdSubType] = useState('');
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

  // 1. Promoted products list (sorted chronologically by starring order)
  const promotedProducts = useMemo(() => {
    return starredIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  }, [products, starredIds]);

  // 2. Grouped products by section
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();

    // Initialize default groups
    groups.set('DIGITAL', []);
    groups.set('VOUCHER', []);
    groups.set('BOOKING', []);

    // Initialize custom groups
    sectionsList.forEach(sec => {
      if (sec !== '__proto__' && sec !== 'constructor' && sec !== 'prototype') {
        groups.set(sec, []);
      }
    });

    // Group products
    products.forEach(p => {
      const sec = getProductSection(productSections, p.id) || p.product_type || 'DIGITAL';
      let secGroup = groups.get(sec);
      if (!secGroup) {
        secGroup = [];
        groups.set(sec, secGroup);
      }
      secGroup.push(p);
    });

    return groups;
  }, [products, sectionsList, productSections]);

  // 3. Move/Reorder Sections handler
  const handleMoveSection = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return;

    const newOrder = [...sectionOrder];
    const [item] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, item);

    setSectionOrder(newOrder);

    if (creator) {
      const pc = creator.profile_customization || {};
      const updatedCustom = {
        ...pc,
        section_order: newOrder
      };
      await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
      });
    }
  };

  // 4. Add custom section handler
  const handleAddSection = async (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) return;
    if (sectionsList.includes(cleaned)) {
      showAlert(lang === 'ru' ? 'Раздел с таким именем уже существует!' : 'Section with this name already exists!');
      return;
    }

    const newList = [...sectionsList, cleaned];
    const newOrder = [...sectionOrder, cleaned];

    setSectionsList(newList);
    setSectionOrder(newOrder);

    if (creator) {
      const pc = creator.profile_customization || {};
      const updatedCustom = {
        ...pc,
        custom_sections: newList,
        section_order: newOrder
      };
      await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
      });
    }
  };

  // 5. Toggle featured / starred product
  const handleToggleStar = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarred = starredIds.includes(productId)
      ? starredIds.filter(id => id !== productId)
      : [...starredIds, productId];

    setStarredIds(newStarred);

    if (creator) {
      const pc = creator.profile_customization || {};
      const updatedCustom = {
        ...pc,
        starred_products: newStarred
      };
      await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
      });
    }
  };

  const dragThrottleRef = useRef(0);
  // 6. Section Drag & Drop Reordering
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  const handleDragStart = (section: string) => {
    setDraggedSection(section);
  };

  const handleDragOver = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    const now = Date.now();
    if (draggedSection && draggedSection !== targetSection && now - dragThrottleRef.current > 80) {
      dragThrottleRef.current = now;
      const oldIdx = sectionOrder.indexOf(draggedSection);
      const newIdx = sectionOrder.indexOf(targetSection);
      const newOrder = [...sectionOrder];
      newOrder.splice(oldIdx, 1);
      newOrder.splice(newIdx, 0, draggedSection);
      setSectionOrder(newOrder);
    }
  };

  const handleDragEnd = async () => {
    setDraggedSection(null);
    if (creator) {
      const pc = creator.profile_customization || {};
      const updatedCustom = {
        ...pc,
        section_order: sectionOrder
      };
      await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
      });
    }
  };

  // 7. Store Share handler
  const handleShareStore = () => {
    if (!creator) return;
    const storeLink = `https://t.me/PaybioBot/app?startapp=ref_${creator.telegram_id}`;
    const shareText = lang === 'ru'
      ? `Посмотри классные цифровые товары, билеты и услуги в магазине @${creator.username || 'автора'} на PayBio!`
      : `Check out digital products, tickets, and services in @${creator.username || 'creator'}'s storefront on PayBio!`;

    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.openTelegramLink) {
        WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(storeLink)}&text=${encodeURIComponent(shareText)}`);
        return;
      }
    }

    navigator.clipboard.writeText(storeLink).then(() => {
      showAlert(lang === 'ru' ? '✓ Ссылка на магазин скопирована в буфер обмена!' : '✓ Storefront link copied to clipboard!');
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
      const WebApp = await getTWA();
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(shareText)}`;
      if (WebApp?.openTelegramLink) {
        WebApp.openTelegramLink(shareUrl);
        return;
      }
      window.open(shareUrl, '_blank');
    } catch (err) {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  // New product type states
  const [prodType, setProdType] = useState('DIGITAL');

  // AI Promo generation states
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoText, setPromoText] = useState('');
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);
  const [selectedPromoProduct, setSelectedPromoProduct] = useState<any>(null);
  const [promoCopied, setPromoCopied] = useState(false);

  // States for Advanced Promo Banner Editor
  const [promoBgUrl, setPromoBgUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');
  const [promoPrompt, setPromoPrompt] = useState('Vibrant abstract 3d rendering fluid style gradient background');
  const [isEditPromptVisible, setIsEditPromptVisible] = useState(false);
  const [promoTextColor, setPromoTextColor] = useState('#ffffff');
  const [promoBgColor, setPromoBgColor] = useState('#2b8cf3');
  const [promoBgType, setPromoBgType] = useState('glass');
  const [promoFontType, setPromoFontType] = useState('sans');
  const [promoTextScale, setPromoTextScale] = useState(1.2);
  const [promoTextX, setPromoTextX] = useState(10);
  const [promoTextY, setPromoTextY] = useState(40);
  const [isPromoDragging, setIsPromoDragging] = useState(false);
  const [isGeneratingPromoBg, setIsGeneratingPromoBg] = useState(false);
  const [isDownloadingPromo, setIsDownloadingPromo] = useState(false);
  const promoContainerRef = useRef<HTMLDivElement>(null);

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

    if (p.cover_url) {
      setPromoBgUrl(p.cover_url);
    } else {
      setPromoBgUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');
    }

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
              setCreator((prev) => prev ? { ...prev, profile_customization: updatedCustom } : null);
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
              setCreator((prev) => prev ? { ...prev, profile_customization: updatedCustom } : null);
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
        body: JSON.stringify({ 
          prompt: aiPrompt,
          title: prodTitle,
          description: prodDesc || aiPrompt,
          price: prodPriceUSD
        })
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


  const t = lang === 'ru' ? TRANSLATIONS.ru : TRANSLATIONS.en;

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
          prodType,
          selectedProductSection,
          prodSubType || undefined
        );
      } else {
        success = await onAddProduct(
          prodTitle,
          prodDesc,
          priceUSD,
          priceStars,
          finalContentUrl || undefined,
          prodCoverUrl || undefined,
          prodType,
          selectedProductSection,
          prodSubType || undefined
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
        setProdSubType('');
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

  if (currentScreen === 'SETTINGS') {
    const bookingProductsList = products.filter(p => p.product_type === 'BOOKING');
    return (
      <SettingsView
        creator={creator}
        lang={lang}
        t={t}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        storeName={storeName}
        storeDescription={storeDescription}
        storeAvatar={storeAvatar}
        storeBanner={storeBanner}
        setStoreAvatar={setStoreAvatar}
        setStoreBanner={setStoreBanner}
        socialLinks={socialLinks}
        onAvatarUpload={handleAvatarUpload}
        onBannerUpload={handleBannerUpload}
        onSaveSettings={onSaveSettings}
        bookingProductsList={bookingProductsList}
        busySlots={busySlots}
        dbBookings={dbBookings}
        fetchBusySlotsForProduct={fetchBusySlotsForProduct}
        buyerTgId={buyerTgId}
        onOpenPremium={onOpenPremium}
        isCreatorPremium={!!creator?.is_premium}
        onTriggerOnboarding={onTriggerOnboarding}
      />
    );
  }

  if (currentScreen === 'PARTNER') {
    return (
      <PartnerDashboard
        creator={creator}
        setCreator={setCreator}
        setCurrentScreen={setCurrentScreen}
        lang={lang}
        t={t}
      />
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--tg-bg)', position: 'relative', paddingTop: 'var(--tg-safe-area-inset-top, env(safe-area-inset-top, 50px))' }} className="animate-fade-in">

      {isOwner && !isCreatorPremium && (
        <div style={{
          background: 'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
          color: '#fff',
          padding: '14px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div>
            ⚠️ {lang === 'ru'
              ? 'Срок действия вашей подписки PayBio истек. Покупатели больше не могут просматривать и покупать ваши товары.'
              : 'Your PayBio subscription has expired. Buyers can no longer view or purchase your products.'}
          </div>
          <button
            onClick={onOpenPremium}
            style={{
              background: '#fff',
              color: '#FF5E62',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            👑 {lang === 'ru' ? 'Активировать Premium' : 'Activate Premium'}
          </button>
        </div>
      )}

      {isOwner && isCreatorPremium && creator?.premium_until && (() => {
        const daysLeft = Math.ceil((new Date(creator.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 7) {
          const daysWord = getDaysWord(daysLeft, lang);
          return (
            <div style={{
              background: 'linear-gradient(135deg, #2b8cf3 0%, #0056b3 100%)',
              color: '#fff',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              position: 'relative',
              zIndex: 100
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left' }}>
                <span>⚠️</span>
                <span>
                  {lang === 'ru'
                    ? `Осталось ${daysLeft} ${daysWord} пробного периода.`
                    : `${daysLeft} ${daysWord} of trial period left.`}
                </span>
              </div>
              <button
                onClick={onOpenPremium}
                style={{
                  background: '#fff',
                  color: '#2b8cf3',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                👑 {lang === 'ru' ? 'Купить Premium' : 'Buy Premium'}
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* ─── BANNER ─── */}
      <div
        className="store-banner animate-fade-in"
        style={{ height: '100px', ...(storeBanner ? { backgroundImage: `url("${storeBanner}")` } : {}) }}
      >
        <div className="store-banner-glow" />
        {isOwner && (
          <label className="store-banner-edit">
            {lang === 'ru' ? '📸 Изменить обложку' : '📸 Change Cover'}
            <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {/* ─── PROFILE HEADER CARD ─── */}
      <div className="store-avatar-wrapper tour-avatar">
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
      <div style={{ padding: '0 20px', marginTop: '-6px', zIndex: 10, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.2 }}>
            {storeName}
          </h1>
          {isCreatorPremium && (
            <span className="chip" style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', fontSize: '9px', padding: '1px 6px', height: '18px', display: 'inline-flex', alignItems: 'center' }}>
              {t.premiumCreator}
            </span>
          )}
        </div>
      </div>

      {/* ─── QUICK ACTIONS BAR ─── */}
      <div className="tour-lang-row" style={{ padding: '0 20px', marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {isOwner && (
          <>
            <button
              onClick={() => setCurrentScreen('PARTNER')}
              className="tour-partner-btn"
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--tg-border)', borderRadius: '12px',
                height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--tg-text)'
              }}
              title={lang === 'ru' ? 'Кабинет партнера' : 'Partner Dashboard'}
            >
              🤝 {lang === 'ru' ? 'Кабинет' : 'Partner'}
            </button>
            <button
              onClick={() => setCurrentScreen('SETTINGS')}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--tg-border)', borderRadius: '12px',
                height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--tg-text)'
              }}
              title={lang === 'ru' ? 'Настройки' : 'Settings'}
            >
              ⚙️ {lang === 'ru' ? 'Настройки' : 'Settings'}
            </button>
            <button
              onClick={handleScanTicket}
              style={{
                background: 'rgba(77,202,90,0.12)', border: '1px solid rgba(77,202,90,0.2)', borderRadius: '12px',
                height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#4dca5a'
              }}
              title={lang === 'ru' ? 'Скан билета' : 'Scan Ticket'}
            >
              📷 {lang === 'ru' ? 'Скан' : 'Scan'}
            </button>
          </>
        )}

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--tg-border)', borderRadius: '12px',
            height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: 'var(--tg-text)'
          }}
          title="Change Language / Сменить язык"
        >
          🌐 {lang === 'en' ? 'EN' : 'RU'}
        </button>

        {isOwner && !isCreatorPremium && (
          <button
            onClick={onOpenPremium}
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', border: 'none', borderRadius: '12px',
              height: '32px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '4px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#000'
            }}
          >
            👑 {t.goPremium}
          </button>
        )}
      </div>

      {/* ─── NICKNAME / HANDLE ─── */}
      {creator?.username && (
        <div style={{ padding: '0 20px', marginTop: '6px' }}>
          <p style={{ fontSize: '13.5px', color: 'var(--tg-accent)', fontWeight: 600, margin: 0 }}>
            @{creator.username}
          </p>
        </div>
      )}

      {/* ─── SHOP DESCRIPTION ─── */}
      <div style={{ padding: '0 20px', marginTop: '8px', marginBottom: '20px' }}>
        <p style={{ fontSize: '13.5px', color: 'var(--tg-hint)', lineHeight: 1.5, margin: 0 }}>
          {storeDescription}
        </p>
      </div>



      {/* ─── LOWER UTILITY SECTION (SOCIALS, STATS) ─── */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Social Links Row */}
          {(hasSocials || (isOwner && !hasSocials)) && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {socialLinks.youtube && (
                <a href={socialLinks.youtube} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(233,92,92,0.12)', color: '#FF0000',
                  border: '1px solid rgba(233,92,92,0.2)', transition: 'transform 0.2s', fontSize: '14px'
                }} className="animate-scale-in">
                  <YoutubeIcon />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(45deg, rgba(240,148,51,0.12) 0%, rgba(230,73,128,0.12) 100%)', color: '#E1306C',
                  border: '1px solid rgba(230,73,128,0.2)', transition: 'transform 0.2s', fontSize: '14px'
                }} className="animate-scale-in">
                  <InstagramIcon />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={socialLinks.tiktok} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.2s', fontSize: '14px'
                }} className="animate-scale-in">
                  <TiktokIcon />
                </a>
              )}
              {socialLinks.vk && (
                <a href={socialLinks.vk} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(74,118,168,0.12)', color: '#4A76A8',
                  border: '1px solid rgba(74,118,168,0.2)', transition: 'transform 0.2s', fontSize: '14px'
                }} className="animate-scale-in">
                  <VkIcon />
                </a>
              )}
              {socialLinks.max && (
                <a href={socialLinks.max} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)', color: '#fff',
                  border: '1px solid var(--tg-border)', transition: 'transform 0.2s', fontSize: '14px'
                }} className="animate-scale-in">
                  <MaxIcon />
                </a>
              )}

              {isOwner && !hasSocials && (
                <button
                  onClick={() => setCurrentScreen('SETTINGS')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--tg-hint)',
                    fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                    cursor: 'pointer', opacity: 0.8, textDecoration: 'underline'
                  }}
                >
                  {t.addSocialsHelp}
                </button>
              )}
            </div>
          )}

          {/* Stats Row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px',
            padding: '10px', background: 'var(--tg-secondary-bg)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--tg-border)',
            textAlign: 'center'
          }}>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.products}</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-text)', marginTop: '2px' }}>{products.length}</p>
            </div>
            <div
              onClick={() => setIsReviewsOpen(true)}
              style={{ borderLeft: '1px solid var(--tg-border)', borderRight: '1px solid var(--tg-border)', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '10px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.rating}</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-text)', marginTop: '2px' }}>⭐️ {lang === 'ru' ? 'Отзывы' : 'Reviews'}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.delivery}</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--tg-green)', marginTop: '2px' }}>{t.instant}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog items container */}
      <div style={{ padding: '0 16px 80px' }}>
        {/* Buyer Storefront Conversion Banner */}
        {!isOwner && (
          <div style={{
            background: 'linear-gradient(135deg, #2b8cf3 0%, #0056b3 100%)',
            color: '#fff',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 6px 20px rgba(43, 140, 243, 0.25)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }} className="animate-scale-in">
            <div style={{
              position: 'absolute', right: '-20px', top: '-20px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute', right: '40px', bottom: '-30px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🚀</span>
              <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                {lang === 'ru' ? 'Создайте свой магазин за 1 минуту!' : 'Create your own storefront in 1 minute!'}
              </h4>
            </div>
            <p style={{ fontSize: '12.5px', opacity: 0.9, lineHeight: 1.45, margin: 0 }}>
              {lang === 'ru'
                ? 'Продавайте файлы, билеты и бронируйте время напрямую в Telegram. Без комиссий с моментальными выплатами на ваш TON-кошелек или карту!'
                : 'Sell files, tickets, and book time directly in Telegram. Zero commissions with instant payouts to your TON wallet or card!'}
            </p>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const botUsername = 'PaybioBot';
                  const WebApp = (window as any).Telegram?.WebApp;
                  if (WebApp?.openTelegramLink) {
                    WebApp.openTelegramLink(`https://t.me/${botUsername}`);
                  } else {
                    window.open(`https://t.me/${botUsername}`, '_blank');
                  }
                }
              }}
              style={{
                alignSelf: 'flex-start',
                background: '#fff',
                color: '#0056b3',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
              }}
            >
              <span>✨</span>
              <span>{lang === 'ru' ? 'Запустить бота' : 'Launch Bot'}</span>
            </button>
          </div>
        )}

        <p className="section-header" style={{ marginBottom: '14px' }}>{t.storeCatalog}</p>

        {/* Promoted / Starred horizontal gallery */}
        {promotedProducts.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p className="section-header" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ffd700' }}>
              <span>⭐</span> {lang === 'ru' ? 'ИЗБРАННОЕ' : 'FEATURED'}
            </p>
            <div className="featured-gallery">
              {promotedProducts.map((p, idx) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  idx={idx}
                  isOwner={isOwner}
                  starredIds={starredIds}
                  lang={lang}
                  t={t}
                  onSelect={onSelect}
                  onToggleStar={handleToggleStar}
                  onGeneratePromo={handleGeneratePromo}
                  onOpenEditProduct={handleOpenEditProduct}
                  onConfirmDelete={handleConfirmDelete}
                  variant="featured"
                />
              ))}
            </div>
          </div>
        )}

        {/* Catalog Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {sectionOrder.map((sectionName, secIdx) => {
            const secProducts = groupedProducts.get(sectionName) || [];
            if (secProducts.length === 0 && !isOwner) return null;

            return (
              <div
                key={sectionName}
                draggable={isOwner}
                onDragStart={() => handleDragStart(sectionName)}
                onDragOver={(e) => handleDragOver(e, sectionName)}
                onDragEnd={handleDragEnd}
                style={{
                  border: draggedSection === sectionName ? '2px dashed var(--tg-accent)' : 'none',
                  background: draggedSection === sectionName ? 'rgba(82,158,255,0.05)' : 'transparent',
                  borderRadius: '8px',
                  padding: draggedSection === sectionName ? '8px' : '0'
                }}
              >
                <div
                  className={secIdx === 0 ? "tour-section-header" : ""}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOwner && (
                      <span style={{ cursor: 'grab', fontSize: '14px', color: 'var(--tg-hint)' }} title="Drag to reorder">
                        ☰
                      </span>
                    )}
                    <h3 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                      {sectionName === 'DIGITAL' ? (lang === 'ru' ? 'Файлы' : 'Files') :
                        sectionName === 'VOUCHER' ? (lang === 'ru' ? 'Билеты' : 'Tickets') :
                          sectionName === 'BOOKING' ? (lang === 'ru' ? 'Записи' : 'Bookings') :
                            sectionName}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>({secProducts.length})</span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateProduct(sectionName)}
                          className={secIdx === 0 ? "tour-add-btn" : ""}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', color: 'var(--tg-text)' }}
                        >
                          ＋ Add
                        </button>
                        {secIdx > 0 && (
                          <button type="button" onClick={() => handleMoveSection(secIdx, 'up')} style={{ background: 'none', border: 'none', color: 'var(--tg-hint)', cursor: 'pointer' }}>▲</button>
                        )}
                        {secIdx < sectionOrder.length - 1 && (
                          <button type="button" onClick={() => handleMoveSection(secIdx, 'down')} style={{ background: 'none', border: 'none', color: 'var(--tg-hint)', cursor: 'pointer' }}>▼</button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {secProducts.length > 0 ? (
                  <div className="product-list">
                    {secProducts.map((p, idx) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        idx={idx}
                        isOwner={isOwner}
                        starredIds={starredIds}
                        lang={lang}
                        t={t}
                        onSelect={onSelect}
                        onToggleStar={handleToggleStar}
                        onGeneratePromo={handleGeneratePromo}
                        onOpenEditProduct={handleOpenEditProduct}
                        onConfirmDelete={handleConfirmDelete}
                        variant="standard"
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', background: 'var(--tg-secondary-bg)', borderRadius: '10px', textAlign: 'center', border: '1px dashed var(--tg-border)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
                      {lang === 'ru' ? 'В этом разделе пока нет товаров.' : 'No products in this section yet.'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Section creation */}
        {isOwner && (
          <div style={{ marginTop: '30px', borderTop: '1px solid var(--tg-border)', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tg-hint)', marginBottom: '8px' }}>
              📁 {lang === 'ru' ? 'Добавить новый раздел каталога' : 'Create Custom Catalog Section'}
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder={lang === 'ru' ? 'Название раздела' : 'Section title'}
                className="tg-input"
                id="new-section-input"
                style={{ flex: 1, padding: '4px 10px', fontSize: '12px', height: '28px', borderRadius: '6px' }}
              />
              <button
                type="button"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--tg-border)',
                  color: 'var(--tg-hint)',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '0 10px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s'
                }}
                onClick={() => {
                  const el = document.getElementById('new-section-input') as HTMLInputElement;
                  if (el && el.value) {
                    handleAddSection(el.value);
                    el.value = '';
                  }
                }}
              >
                ＋ {lang === 'ru' ? 'Создать' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* ─── BIO LINK & QUICK INSTRUCTIONS (OWNER ONLY) ─── */}
        {isOwner && (
          <div style={{ padding: '0', marginTop: '30px', borderTop: '1px solid var(--tg-border)', paddingTop: '20px' }}>
            <div className="tg-card" style={{ padding: '12px 16px', border: '1px solid rgba(82,158,255,0.2)', background: 'rgba(82,158,255,0.02)', borderRadius: '12px' }}>
              <div
                onClick={() => setIsBioLinkExpanded(!isBioLinkExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔗 {lang === 'ru' ? 'Ссылка для описания профиля (Bio)' : 'Link for Telegram Bio'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{isBioLinkExpanded ? '▲' : '▼'}</span>
              </div>

              {isBioLinkExpanded && (
                <div style={{ marginTop: '12px' }} className="animate-fade-in">
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--tg-hint)', lineHeight: 1.4 }}>
                    {lang === 'ru'
                      ? 'Скопируйте ссылку на магазин и рекомендуемый текст описания ниже, затем вставьте их в поле «О себе» (Bio) в настройках вашего профиля Telegram.'
                      : 'Copy the storefront link and suggested bio description text below, then paste them into your Telegram "About" (Bio) profile settings.'}
                  </p>

                  {/* Storefront Link */}
                  <p style={{ margin: '8px 0 4px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
                    🌐 {lang === 'ru' ? 'Ссылка на ваш магазин:' : 'Your storefront link:'}
                  </p>
                  <div className="copy-block" style={{ background: 'var(--tg-bg)', marginBottom: '12px' }}>
                    <span className="copy-value" style={{ fontSize: '12px' }}>
                      {`https://t.me/PaybioBot/app?startapp=ref_${creator?.telegram_id || ''}`}
                    </span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://t.me/PaybioBot/app?startapp=ref_${creator?.telegram_id || ''}`);
                        showAlert(lang === 'ru' ? '✓ Ссылка скопирована!' : '✓ Link copied!');
                      }}
                    >
                      {lang === 'ru' ? 'Копировать' : 'Copy'}
                    </button>
                  </div>

                  {/* Suggested Bio Copy */}
                  <p style={{ margin: '12px 0 4px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
                    📝 {lang === 'ru' ? 'Рекомендуемый текст для БИО:' : 'Suggested bio description:'}
                  </p>
                  <div className="copy-block" style={{ background: 'var(--tg-bg)', marginBottom: '16px' }}>
                    <span className="copy-value" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                      {lang === 'ru' ? '🏪 Мой ИИ-магазин. Покупайте товары и услуги здесь 👇' : '🏪 My AI storefront. Buy products and services here 👇'}
                    </span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(lang === 'ru' ? '🏪 Мой ИИ-магазин. Покупайте товары и услуги здесь 👇' : '🏪 My AI storefront. Buy products and services here 👇');
                        showAlert(lang === 'ru' ? '✓ Текст скопирован!' : '✓ Text copied!');
                      }}
                    >
                      {lang === 'ru' ? 'Копировать' : 'Copy'}
                    </button>
                  </div>

                  {/* Step-by-step Guide */}
                  <div style={{ marginTop: '12px', borderTop: '1px solid rgba(82,158,255,0.1)', paddingTop: '10px' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '11.5px', fontWeight: 700, color: 'var(--tg-text)' }}>
                      {lang === 'ru' ? 'Инструкция по настройке:' : 'How to set up:'}
                    </p>
                    <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: 'var(--tg-hint)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <li>{lang === 'ru' ? 'Скопируйте ссылку и предложенный текст БИО.' : 'Copy the storefront link and suggested bio text.'}</li>
                      <li>{lang === 'ru' ? 'Откройте настройки Telegram -> Изменить профиль (или поле "О себе").' : 'Open Telegram Settings -> Edit Profile (or "About" field).'}</li>
                      <li>{lang === 'ru' ? 'Вставьте ссылку и текст в поле описания и сохраните!' : 'Paste the link and text into the description field and save changes!'}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── SHARE STORE & PARTNER BLOCK ─── */}
        <div style={{ padding: '0', marginTop: '20px' }}>
          <div className="tg-card" style={{ padding: '12px 16px', border: '1px dashed var(--tg-border)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
            <div
              onClick={() => setIsShareEarnExpanded(!isShareEarnExpanded)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tg-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📢 {lang === 'ru' ? 'Поделиться и заработать 10%' : 'Share & Earn 10%'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>{isShareEarnExpanded ? '▲' : '▼'}</span>
            </div>

            {isShareEarnExpanded && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleShareStore}
                    className="btn-primary"
                    style={{
                      background: 'var(--tg-accent)',
                      color: '#fff',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    📢 {lang === 'ru' ? 'Поделиться' : 'Share Store'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareAffiliateLink}
                    className="btn-secondary"
                    style={{
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    🤝 {lang === 'ru' ? 'Пригласить' : 'Invite'}
                  </button>
                </div>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1.5px dashed var(--tg-border)',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: 'var(--tg-hint)',
                  lineHeight: '1.4'
                }}>
                  💡 {lang === 'ru'
                    ? 'Попросите клиентов делиться ссылкой на ваш магазин, чтобы привлечь больше покупателей!'
                    : 'Ask clients to share your storefront link to drive more sales!'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── BOTTOM SHEET: STORE REVIEWS ─── */}
      <div className={`bottom-sheet-overlay ${isReviewsOpen ? 'active' : ''}`} onClick={() => setIsReviewsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85svh', overflowY: 'auto' }}>
          <div className="bottom-sheet-handle" />
          <button
            type="button"
            onClick={() => setIsReviewsOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <ReviewsDashboard creatorId={creator?.id || ''} buyerTgId={buyerTgId} lang={lang} t={t} />
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
                    <span className="type-card-title">{lang === 'ru' ? 'Цифровой товар' : 'Digital Product'}</span>
                    <span className="type-card-desc">{lang === 'ru' ? 'Файлы, книги, курсы, ссылки' : 'Files, eBooks, courses, links'}</span>
                  </div>
                </button>

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
                    <span className="type-card-title">{lang === 'ru' ? 'Билет или Ваучер' : 'Ticket or Voucher'}</span>
                    <span className="type-card-desc">{lang === 'ru' ? 'Электронный билет с QR-кодом для входа' : 'E-ticket with verification QR'}</span>
                  </div>
                </button>

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
                    <span className="type-card-title">{lang === 'ru' ? 'Запись на время' : 'Booking / Session'}</span>
                    <span className="type-card-desc">{lang === 'ru' ? 'Бронирование слотов в календаре' : 'Booking calendar slots'}</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateProduct} className="animate-fade-in">
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
                  placeholder="Describe what customers get..."
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setProdPriceUSD(val);
                      const num = Number(val);
                      if (!isNaN(num) && num > 0) {
                        setProdPriceStars(String(Math.round(num * 50)));
                      } else {
                        setProdPriceStars('');
                      }
                    }}
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setProdPriceStars(val);
                      const num = Number(val);
                      if (!isNaN(num) && num > 0) {
                        setProdPriceUSD(String(Math.round((num / 50) * 100) / 100));
                      } else {
                        setProdPriceUSD('');
                      }
                    }}
                  />
                </div>
              </div>

              {prodType === 'VOUCHER' && (
                <>
                  <div className="bottom-sheet-form-group animate-fade-in">
                    <label className="bottom-sheet-label">
                      {lang === 'ru' ? 'Тип билета/товара' : 'Ticket/Product Type'}
                    </label>
                    <select
                      className="tg-input"
                      value={prodSubType}
                      onChange={(e) => setProdSubType(e.target.value)}
                      style={{ background: 'var(--tg-bg)', color: 'var(--tg-text)' }}
                    >
                      <option value="">{lang === 'ru' ? '🎟️ Электронный билет / Ваучер' : '🎟️ Digital Ticket / Voucher'}</option>
                      <option value="PHYSICAL">{lang === 'ru' ? '📦 Физический товар (доставка)' : '📦 Physical Good (requires shipping)'}</option>
                    </select>
                  </div>

                  <div className="bottom-sheet-form-group animate-fade-in">
                    <label className="bottom-sheet-label">
                      {lang === 'ru' ? 'Лимит количества' : 'Max Quantity Limit'}
                    </label>
                    <input
                      type="number"
                      className="tg-input"
                      placeholder="e.g. 50"
                      value={prodMaxQuantity}
                      onChange={(e) => setProdMaxQuantity(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">
                  {prodType === 'BOOKING'
                    ? (lang === 'ru' ? 'Свободные часы' : 'Available Slots')
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
                    {lang === 'ru' ? 'Ссылка на ICS календарь' : 'Calendar ICS Link'}
                  </label>
                  <input
                    type="text"
                    className="tg-input"
                    placeholder="webcal://..."
                    value={prodCalendarIcsUrl}
                    onChange={(e) => setProdCalendarIcsUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">{t.productCover}</label>

                {prodCoverUrl && (
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '10px',
                    backgroundImage: `url("${prodCoverUrl}")`,
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
                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--tg-hint)' }}>— or —</div>
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
                    <div style={{ padding: '10px 12px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '8px', fontSize: '11px', lineHeight: '1.4', color: 'var(--tg-text)' }}>
                      {t.botNotice}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  marginTop: '14px',
                  background: isAdding ? 'var(--tg-hint)' : 'var(--tg-accent)',
                  cursor: isAdding ? 'not-allowed' : 'pointer'
                }}
                disabled={isAdding}
              >
                {isAdding ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span className="spinner-mini" style={{
                      width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    {editingProduct ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : (lang === 'ru' ? 'Добавление...' : 'Adding...')}
                  </span>
                ) : (
                  editingProduct ? (lang === 'ru' ? 'Сохранить изменения ✓' : 'Save Changes ✓') : t.addProductBtn
                )}
              </button>
            </form>
          )}
        </div>
      </div>

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
              {lang === 'ru' ? 'Сгенерированный ИИ продающий пост:' : 'AI-generated high-converting promo post:'}
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
});

export default ProductListScreen;
