'use client';

import { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import ImageCropper from '@/components/ImageCropper';
import BookingCalendar from '@/components/BookingCalendar';
import LoadingScreen from '@/components/LoadingScreen';
import ProductCard from '@/components/ProductCard';
import ErrorScreen from '@/components/ErrorScreen';
import ReviewsDashboard from '@/components/ReviewsDashboard';
import { YoutubeIcon, InstagramIcon, TiktokIcon, VkIcon, MaxIcon } from '@/components/Icons';
import { Creator, Product } from '@/types/store';
import { compressImage } from '@/utils/image';
import { getTWA, showAlert, cleanProductId, handleOpenLink } from '@/utils/telegram';
import PremiumFlow from '@/components/PremiumFlow';
import { TRANSLATIONS } from '@/lib/translations';

// Emojis for mock product cover styles (used as fallback)
const coverStyles = [
  { bg: 'linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)', icon: '📘' }, // Ebook
  { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '⚡' }, // Tutorial
  { bg: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', icon: '🎨' }, // Assets
];

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
  onAddProduct: (title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string, section?: string) => Promise<boolean>;
  onOpenPremium: () => void;
  lang: 'en' | 'ru';
  setLang: (lang: 'en' | 'ru') => void;
  isOwner: boolean;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onUpdateProduct: (id: string, title: string, description: string, priceFiat: number, priceStars?: number, contentUrl?: string, coverUrl?: string, productType?: string, section?: string) => Promise<boolean>;
  
  currentScreen: 'CATALOG' | 'SETTINGS';
  setCurrentScreen: (screen: 'CATALOG' | 'SETTINGS') => void;
  starredIds: string[];
  setStarredIds: (ids: string[]) => void;
  sectionsList: string[];
  setSectionsList: (list: string[]) => void;
  sectionOrder: string[];
  setSectionOrder: (order: string[]) => void;
  productSections: Record<string, string>;
  setProductSections: (sections: Record<string, string>) => void;
  onSaveSettings: (name: string, description: string, avatar: string, banner: string, socials: any, ton: string, p2p: string, p2pList: any[], calendarProvider: string, icsUrl: string) => Promise<void>;
  busySlots: { start: string; end: string }[];
  dbBookings: any[];
  fetchBusySlotsForProduct: (prodId: string) => Promise<void>;
  buyerTgId: number;
}

const ProductListScreen = memo(function ProductListScreen({
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
  buyerTgId
}: ProductListScreenProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditSocialsOpen, setIsEditSocialsOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creationStep, setCreationStep] = useState<'TYPE_SELECT' | 'FORM'>('TYPE_SELECT');

  const isCreatorPremium = !!creator?.is_premium;
  const hasSocials = !!(socialLinks.youtube || socialLinks.instagram || socialLinks.tiktok || socialLinks.vk || socialLinks.max);

  const [activeTab, setActiveTab] = useState<'catalog' | 'reviews'>('catalog');
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const [selectedProductSection, setSelectedProductSection] = useState('DIGITAL');

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(
      tempStoreName,
      tempStoreDesc,
      tempStoreAvatar,
      tempStoreBanner,
      {
        youtube: tempYoutube,
        instagram: tempInsta,
        tiktok: tempTiktok,
        vk: tempVk,
        max: tempMax
      },
      tempTonVal,
      tempP2pVal,
      tempCardsList,
      tempCalProvider,
      tempCalIcsUrl
    );
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdTitle(p.title);
    setProdDesc(p.description || '');
    setProdPriceUSD(String(p.price_fiat));
    setProdPriceStars(p.price_stars ? String(p.price_stars) : '');
    setProdCoverUrl(p.cover_url || '');
    setProdType(p.product_type || 'DIGITAL');
    setSelectedProductSection(productSections[p.id] || p.product_type || 'DIGITAL');

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
    setSelectedProductSection(defaultSection);
    setCreationStep('TYPE_SELECT');
    setIsAddProductOpen(true);
  };

  // Unified Settings Panel form states
  const [tempStoreName, setTempStoreName] = useState(storeName);
  const [tempStoreDesc, setTempStoreDesc] = useState(storeDescription);
  const [tempStoreAvatar, setTempStoreAvatar] = useState(storeAvatar);
  const [tempStoreBanner, setTempStoreBanner] = useState(storeBanner);
  
  const [tempYoutube, setTempYoutube] = useState(socialLinks.youtube || '');
  const [tempInsta, setTempInsta] = useState(socialLinks.instagram || '');
  const [tempTiktok, setTempTiktok] = useState(socialLinks.tiktok || '');
  const [tempVk, setTempVk] = useState(socialLinks.vk || '');
  const [tempMax, setTempMax] = useState(socialLinks.max || '');
  
  const [tempTonVal, setTempTonVal] = useState('');
  const [tempP2pVal, setTempP2pVal] = useState('');
  const [tempCardsList, setTempCardsList] = useState<any[]>([]);
  const [tempCalProvider, setTempCalProvider] = useState('none');
  const [tempCalIcsUrl, setTempCalIcsUrl] = useState('');

  // Sync state values when settings screen opens or creator changes
  useEffect(() => {
    if (creator) {
      setTempStoreName(storeName);
      setTempStoreDesc(storeDescription);
      setTempStoreAvatar(storeAvatar);
      setTempStoreBanner(storeBanner);
      
      setTempYoutube(socialLinks.youtube || '');
      setTempInsta(socialLinks.instagram || '');
      setTempTiktok(socialLinks.tiktok || '');
      setTempVk(socialLinks.vk || '');
      setTempMax(socialLinks.max || '');
      
      const pd = creator.payment_details || {};
      setTempTonVal(pd.ton || '');
      setTempP2pVal(pd.p2p || '');
      setTempCardsList(pd.p2p_list || []);
      setTempCalProvider(pd.calendar_provider || 'none');
      setTempCalIcsUrl(pd.ics_url || '');
    }
  }, [creator, currentScreen, storeName, storeDescription, storeAvatar, storeBanner, socialLinks]);

  // Find booking products for schedule config
  const bookingProductsList = useMemo(() => {
    return products.filter(p => p.product_type === 'BOOKING');
  }, [products]);
  
  const [selectedSettingsBookingProdId, setSelectedSettingsBookingProdId] = useState(() => {
    return bookingProductsList[0]?.id || '';
  });
  
  useEffect(() => {
    if (bookingProductsList.length > 0 && !selectedSettingsBookingProdId) {
      setSelectedSettingsBookingProdId(bookingProductsList[0].id);
    }
  }, [bookingProductsList, selectedSettingsBookingProdId]);

  // Load slots for selected settings product
  useEffect(() => {
    if (selectedSettingsBookingProdId && currentScreen === 'SETTINGS') {
      fetchBusySlotsForProduct(selectedSettingsBookingProdId);
    }
  }, [selectedSettingsBookingProdId, currentScreen]);

  const [settingsBookingDate, setSettingsBookingDate] = useState('');
  const [settingsBookingTime, setSettingsBookingTime] = useState('');
  
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

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

  // 1. Promoted products list
  const promotedProducts = useMemo(() => {
    return products.filter(p => starredIds.includes(p.id));
  }, [products, starredIds]);

  // 2. Grouped products by section
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    // Initialize default groups
    groups['DIGITAL'] = [];
    groups['VOUCHER'] = [];
    groups['BOOKING'] = [];
    
    // Initialize custom groups
    sectionsList.forEach(sec => {
      groups[sec] = [];
    });
    
    // Group products
    products.forEach(p => {
      const sec = productSections[p.id] || p.product_type || 'DIGITAL';
      if (!groups[sec]) {
        groups[sec] = [];
      }
      groups[sec].push(p);
    });
    
    return groups;
  }, [products, sectionsList, productSections]);

  // 3. Move/Reorder Sections handler
  const handleMoveSection = async (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return;
    
    const newOrder = [...sectionOrder];
    const temp = newOrder[idx];
    newOrder[idx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    
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
    const storeLink = `https://t.me/PaybioBot/app?startapp=${creator.telegram_id}`;
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

  const handleGeneratePromoBg = async () => {
    if (!isCreatorPremium) {
      showAlert(lang === 'ru' ? '👑 Генерация изображений доступна только Premium авторам!' : '👑 Image generation is only available for Premium creators!');
      onOpenPremium();
      return;
    }
    setIsGeneratingPromoBg(true);
    try {
      const res = await fetch('/api/store/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promoPrompt })
      });
      const data = await res.json();
      if (res.ok && data.success && data.image_url) {
        setPromoBgUrl(data.image_url);
        showAlert(lang === 'ru' ? '🎨 Фоновое изображение сгенерировано!' : '🎨 Background image generated!');
      } else {
        showAlert(data.error || 'Failed to generate image.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error generating background image.');
    } finally {
      setIsGeneratingPromoBg(false);
    }
  };

  const handlePromoBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPromoBgUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleDownloadPromoBanner = async (action: 'download' | 'share' | 'send') => {
    setIsDownloadingPromo(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, 800, 800);
          resolve();
        };
        bgImg.onerror = () => {
          const grad = ctx.createLinearGradient(0, 0, 800, 800);
          grad.addColorStop(0, '#1e3c72');
          grad.addColorStop(1, '#2a5298');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 800, 800);
          resolve();
        };
        bgImg.src = promoBgUrl;
      });

      ctx.save();

      let fontName = 'sans-serif';
      let fontStyle = '';
      if (promoFontType === 'serif') fontName = 'Georgia, serif';
      else if (promoFontType === 'mono') fontName = '"Courier New", Courier, monospace';
      else if (promoFontType === 'outfit') fontName = 'sans-serif';
      else if (promoFontType === 'playfair') fontName = 'Georgia, serif';
      else if (promoFontType === 'comic') fontName = '"Comic Sans MS", cursive, sans-serif';
      else if (promoFontType === 'impact') fontName = 'Impact, sans-serif';
      else if (promoFontType === 'italic-serif') { fontName = 'Georgia, serif'; fontStyle = 'italic '; }
      else if (promoFontType === 'bold-sans') { fontName = 'sans-serif'; fontStyle = '900 '; }
      else if (promoFontType === 'cursive') fontName = 'cursive';

      const baseFontSize = 24 * promoTextScale;
      ctx.font = `${fontStyle}${baseFontSize}px ${fontName}`;
      ctx.textBaseline = 'top';

      const posX = (promoTextX / 100) * 800;
      const posY = (promoTextY / 100) * 800;

      const maxTextWidth = 800 * 0.75;
      const words = promoText.split(' ');
      let line = '';
      const lines: string[] = [];
      const lineHeight = baseFontSize * 1.4;

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && n > 0) {
          lines.push(line.trim());
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      let longestLine = 0;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > longestLine) longestLine = w;
      });

      const padX = 22;
      const padY = 16;
      const containerW = longestLine + padX * 2;
      const containerH = lines.length * lineHeight + padY * 2;

      ctx.translate(posX + containerW/2, posY + containerH/2);
      if (promoBgType === 'sticker') {
        ctx.rotate(-2 * Math.PI / 180);
      }
      ctx.translate(-containerW/2, -containerH/2);

      ctx.fillStyle = promoBgColor;
      ctx.strokeStyle = promoTextColor;

      if (promoBgType === 'flat') {
        ctx.fillRect(0, 0, containerW, containerH);
      } else if (promoBgType === 'glass') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, 0, containerW, containerH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, containerW, containerH);
      } else if (promoBgType === 'sticker') {
        ctx.fillStyle = '#fcf6df';
        ctx.fillRect(0, 0, containerW, containerH);
        ctx.strokeStyle = '#b89060';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(0, 0, containerW, containerH);
        ctx.setLineDash([]);
      } else if (promoBgType === 'neon') {
        ctx.fillStyle = 'rgba(15, 10, 20, 0.7)';
        ctx.fillRect(0, 0, containerW, containerH);
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 10;
        ctx.strokeRect(0, 0, containerW, containerH);
        ctx.shadowBlur = 0;
      } else if (promoBgType === 'bubble') {
        ctx.beginPath();
        const r = 18;
        ctx.roundRect ? ctx.roundRect(0, 0, containerW, containerH, [r, r, r, 2]) : ctx.rect(0, 0, containerW, containerH);
        ctx.fill();
      } else if (promoBgType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, containerW, containerH);
        grad.addColorStop(0, '#ff5e62');
        grad.addColorStop(1, '#ff9966');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, containerW, containerH);
      } else if (promoBgType === 'retro') {
        ctx.fillRect(0, 0, containerW, containerH);
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, containerW - 8, containerH - 8);
      } else if (promoBgType === 'darkplate') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, containerW, containerH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, containerW, containerH);
      }

      ctx.fillStyle = promoTextColor;
      if (promoBgType === 'sticker') {
        ctx.fillStyle = '#5c3a21';
      }
      
      if (promoBgType === 'shadow') {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
      } else if (promoBgType === 'neon') {
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 6;
      }

      lines.forEach((l, idx) => {
        const textW = ctx.measureText(l).width;
        const lineX = (containerW - textW) / 2;
        const lineY = padY + idx * lineHeight;
        ctx.fillText(l, lineX, lineY);
      });

      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');

      if (action === 'download') {
        const link = document.createElement('a');
        link.download = `promo_${selectedPromoProduct?.title || 'banner'}.png`;
        link.href = dataUrl;
        link.click();
        showAlert(lang === 'ru' ? '✓ Изображение скачано!' : '✓ Image downloaded!');
      } else if (action === 'share') {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.shareToStories) {
          (window as any).Telegram.WebApp.shareToStories(dataUrl);
        } else {
          if (navigator.share) {
            const blob = await (await fetch(dataUrl)).blob();
            const fileObj = new File([blob], 'promo.png', { type: 'image/png' });
            navigator.share({
              files: [fileObj],
              title: 'Promo Banner',
              text: promoText
            }).catch(() => {});
          } else {
            const link = document.createElement('a');
            link.download = `promo.png`;
            link.href = dataUrl;
            link.click();
          }
        }
      } else if (action === 'send') {
        try {
          const WebApp = await getTWA();
          WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(`t.me/PaybioBot/app?startapp=${selectedPromoProduct?.id}`)}&text=${encodeURIComponent(promoText)}`);
        } catch {
          window.open(`https://t.me/share/url?url=${encodeURIComponent(`t.me/PaybioBot/app?startapp=${selectedPromoProduct?.id}`)}&text=${encodeURIComponent(promoText)}`, '_blank');
        }
      }

    } catch (err: any) {
      showAlert(err.message || 'Error processing banner download.');
    } finally {
      setIsDownloadingPromo(false);
    }
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

  const t = TRANSLATIONS[lang];

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
          selectedProductSection
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
          selectedProductSection
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

  const formatPremiumDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Render Settings Screen if currentScreen is SETTINGS
  if (currentScreen === 'SETTINGS') {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--tg-bg)', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 16px 80px', color: 'var(--tg-text)' }} className="animate-fade-in">
        {/* Settings Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => setCurrentScreen('CATALOG')}
            style={{ background: 'none', border: 'none', color: 'var(--tg-link)', fontSize: '16px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            ← {lang === 'ru' ? 'Назад' : 'Back'}
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
            {lang === 'ru' ? 'Настройки' : 'Settings'}
          </h1>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: Profile Customization */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span> {lang === 'ru' ? 'Профиль магазина' : 'Shop Profile'}
            </h3>

            {/* Subscription Statistics */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              border: '1px solid var(--tg-border)'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--tg-text)' }}>
                  {lang === 'ru' ? 'Тарифный план' : 'Subscription Plan'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--tg-hint)' }}>
                  {isCreatorPremium ? (
                    <span>
                      👑 {lang === 'ru' ? `Премиум активен до: ${formatPremiumDate(creator?.premium_until)}` : `Premium active until: ${formatPremiumDate(creator?.premium_until)}`}
                    </span>
                  ) : (
                    <span>{lang === 'ru' ? 'Бесплатный тариф' : 'Free package'}</span>
                  )}
                </p>
              </div>
              {!isCreatorPremium && (
                <button
                  type="button"
                  onClick={onOpenPremium}
                  className="btn-primary"
                  style={{
                    width: 'auto',
                    padding: '6px 14px',
                    height: 'auto',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
                    color: '#000',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'ru' ? 'Улучшить ⚡' : 'Upgrade ⚡'}
                </button>
              )}
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.shopName}</label>
              <input 
                type="text" 
                className="tg-input" 
                value={tempStoreName} 
                onChange={(e) => setTempStoreName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.shopDescription}</label>
              <textarea 
                className="tg-input" 
                value={tempStoreDesc} 
                onChange={(e) => setTempStoreDesc(e.target.value)} 
                rows={3}
                style={{ resize: 'none' }}
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>{lang === 'ru' ? 'Аватар (1:1)' : 'Avatar (1:1)'}</label>
                {tempStoreAvatar && (
                  <img src={tempStoreAvatar} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', display: 'block', marginBottom: '8px' }} />
                )}
                <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer', fontSize: '11px', padding: '6px' }}>
                  📸 {lang === 'ru' ? 'Аватар' : 'Avatar'}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <div>
                <label className="bottom-sheet-label" style={{ fontSize: '11px' }}>{lang === 'ru' ? 'Баннер (3:1)' : 'Banner (3:1)'}</label>
                {tempStoreBanner && (
                  <img src={tempStoreBanner} style={{ width: '100%', height: '36px', borderRadius: '6px', objectFit: 'cover', display: 'block', marginBottom: '8px' }} />
                )}
                <label className="btn-secondary" style={{ textAlign: 'center', display: 'block', cursor: 'pointer', fontSize: '11px', padding: '6px' }}>
                  📸 {lang === 'ru' ? 'Баннер' : 'Banner'}
                  <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Social Networks */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔗</span> {lang === 'ru' ? 'Социальные сети' : 'Social Networks'}
            </h3>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.youtubeLink}</label>
              <input type="url" className="tg-input" placeholder="https://youtube.com/@channel" value={tempYoutube} onChange={(e) => setTempYoutube(e.target.value)} />
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.instagramLink}</label>
              <input type="url" className="tg-input" placeholder="https://instagram.com/profile" value={tempInsta} onChange={(e) => setTempInsta(e.target.value)} />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.tiktokLink}</label>
              <input type="url" className="tg-input" placeholder="https://tiktok.com/@profile" value={tempTiktok} onChange={(e) => setTempTiktok(e.target.value)} />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.vkLink}</label>
              <input type="url" className="tg-input" placeholder="https://vk.com/page" value={tempVk} onChange={(e) => setTempVk(e.target.value)} />
            </div>

            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{t.maxLink}</label>
              <input type="url" className="tg-input" placeholder="https://x.com/handle" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
            </div>
          </div>

          {/* Section 3: Payment Details */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💳</span> {lang === 'ru' ? 'Реквизиты оплаты' : 'Payment Details'}
            </h3>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Основной TON кошелек' : 'Default TON Wallet'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" className="tg-input" placeholder="UQ..." value={tempTonVal} onChange={(e) => setTempTonVal(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 12px', whiteSpace: 'nowrap', fontSize: '12px', background: 'var(--tg-accent)' }} onClick={handleConnectWallet}>
                  💎 {lang === 'ru' ? 'Wallet' : 'Connect Wallet'}
                </button>
              </div>
            </div>
            
            <div className="bottom-sheet-form-group">
              <label className="bottom-sheet-label">{lang === 'ru' ? 'Основная карта P2P' : 'Default P2P Card'}</label>
              <input type="text" className="tg-input" placeholder="Visa 4321-..." value={tempP2pVal} onChange={(e) => setTempP2pVal(e.target.value)} />
            </div>

            {isCreatorPremium ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--tg-border)', paddingTop: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: 'var(--tg-text)' }}>
                  👑 {lang === 'ru' ? 'Дополнительные карты P2P' : 'Additional P2P Cards'} ({tempCardsList.length})
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tempCardsList.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--tg-secondary-bg)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }}>
                      <span><strong>{item.label}:</strong> {item.card}</span>
                      <button type="button" onClick={() => setTempCardsList(tempCardsList.filter(c => c.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '14px' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" placeholder={lang === 'ru' ? 'Банк' : 'Bank'} className="tg-input" style={{ flex: 1, fontSize: '12px', padding: '6px' }} value={newP2pLabel} onChange={(e) => setNewP2pLabel(e.target.value)} />
                  <input type="text" placeholder={lang === 'ru' ? 'Карта' : 'Card'} className="tg-input" style={{ flex: 2, fontSize: '12px', padding: '6px' }} value={newP2pCard} onChange={(e) => setNewP2pCard(e.target.value)} />
                  <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 12px', fontSize: '12px' }} onClick={() => {
                    if (newP2pLabel && newP2pCard) {
                      setTempCardsList([...tempCardsList, { id: 'card_' + Date.now(), label: newP2pLabel, card: newP2pCard }]);
                      setNewP2pLabel('');
                      setNewP2pCard('');
                    }
                  }}>
                    ＋
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px', background: 'rgba(255,215,0,0.08)', border: '1px dashed rgba(255,215,0,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#ffd700', margin: 0 }}>👑 Premium: Добавление нескольких карт P2P</p>
              </div>
            )}
          </div>

          {/* Section 4: Calendar Sync & Schedule */}
          <div className="tg-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span> {lang === 'ru' ? 'Интеграция календаря' : 'Calendar Integration'}
            </h3>
            
            <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0 }}>
              {lang === 'ru' ? 'Выберите провайдер для синхронизации занятых слотов:' : 'Choose a provider to sync busy slots:'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['none', 'google', 'apple'].map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setTempCalProvider(prov)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: tempCalProvider === prov ? '2px solid var(--tg-accent)' : '1px solid var(--tg-border)',
                    background: tempCalProvider === prov ? 'rgba(82,158,255,0.08)' : 'transparent',
                    color: 'var(--tg-text)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {prov === 'none' ? 'None' : prov}
                </button>
              ))}
            </div>

            {tempCalProvider !== 'none' && (
              <div className="bottom-sheet-form-group">
                <label className="bottom-sheet-label">{lang === 'ru' ? 'Ссылка на ICS календарь' : 'Calendar ICS Link'}</label>
                <input type="url" className="tg-input" placeholder="webcal://... or https://..." value={tempCalIcsUrl} onChange={(e) => setTempCalIcsUrl(e.target.value)} />
              </div>
            )}

            {/* Local DB Booking Calendar */}
            <div style={{ borderTop: '1px solid var(--tg-border)', paddingTop: '14px', marginTop: '6px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800 }}>
                ⚙️ {lang === 'ru' ? 'Управление бронированиями' : 'Manage Bookings'}
              </h4>
              {bookingProductsList.length > 0 ? (
                <>
                  <div className="bottom-sheet-form-group" style={{ marginBottom: '12px' }}>
                    <label className="bottom-sheet-label">{lang === 'ru' ? 'Выберите товар-запись' : 'Select Booking Product'}</label>
                    <select
                      className="tg-input"
                      value={selectedSettingsBookingProdId}
                      onChange={(e) => setSelectedSettingsBookingProdId(e.target.value)}
                      style={{ background: 'var(--tg-secondary-bg)', color: 'var(--tg-text)', border: '1px solid var(--tg-border)' }}
                    >
                      {bookingProductsList.map((bp) => (
                        <option key={bp.id} value={bp.id}>{bp.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Embedding BookingCalendar in Creator Mode */}
                  <BookingCalendar
                    slotsText={bookingProductsList.find(bp => bp.id === selectedSettingsBookingProdId)?.content_url || ''}
                    busySlots={busySlots}
                    bookings={dbBookings}
                    bookingDate={settingsBookingDate}
                    setBookingDate={setSettingsBookingDate}
                    bookingTime={settingsBookingTime}
                    setBookingTime={setSettingsBookingTime}
                    lang={lang}
                    isOwner={true}
                    productId={selectedSettingsBookingProdId}
                    userTgId={buyerTgId}
                    onRefreshBusySlots={() => fetchBusySlotsForProduct(selectedSettingsBookingProdId)}
                  />
                </>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)', margin: 0, fontStyle: 'italic' }}>
                  {lang === 'ru' ? 'У вас нет услуг по бронированию времени.' : 'You have no booking-type services.'}
                </p>
              )}
            </div>
          </div>

          {/* Save & Cancel Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ flex: 1 }}
              onClick={() => setCurrentScreen('CATALOG')}
            >
              {lang === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 2 }}
            >
              {lang === 'ru' ? 'Сохранить настройки ✓' : 'Save Settings ✓'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Normal Storefront View
  return (
    <div style={{ minHeight: '100svh', background: 'var(--tg-bg)', position: 'relative', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)' }} className="animate-fade-in">
      
      {/* ─── BANNER ─── */}
      <div 
        className="store-banner animate-fade-in" 
        style={storeBanner ? { backgroundImage: `url("${storeBanner}")` } : undefined}
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
                  onClick={() => setCurrentScreen('SETTINGS')}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', fontSize: '13px'
                  }}
                  title={lang === 'ru' ? 'Настройки' : 'Settings'}
                >
                  ⚙️
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
              /* Scan Ticket */
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
                📷 {lang === 'ru' ? 'Сканировать' : 'Scan'}
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
          
          {isOwner && !hasSocials && (
            <button 
              onClick={() => setCurrentScreen('SETTINGS')}
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
          <div 
            onClick={() => setIsReviewsOpen(true)}
            style={{ borderLeft: '1px solid var(--tg-border)', borderRight: '1px solid var(--tg-border)', cursor: 'pointer' }}
          >
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.rating}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-text)', marginTop: '2px' }}>⭐️ {lang === 'ru' ? 'Отзывы' : 'Reviews'}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', textTransform: 'uppercase', fontWeight: 600 }}>{t.delivery}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--tg-green)', marginTop: '2px' }}>{t.instant}</p>
          </div>
        </div>
      </div>

      {/* ─── BIO LINK & QUICK INSTRUCTIONS (OWNER ONLY) ─── */}
      {isOwner && (
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <div className="tg-card" style={{ padding: '14px', border: '1px solid rgba(82,158,255,0.2)', background: 'rgba(82,158,255,0.02)' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: 'var(--tg-accent)' }}>
              🔗 {lang === 'ru' ? 'Ссылка для описания профиля (Bio)' : 'Link for Telegram Bio'}
            </p>
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
                {`https://t.me/PaybioBot/app?startapp=${creator?.telegram_id || ''}`}
              </span>
              <button 
                type="button" 
                className="copy-btn" 
                onClick={() => {
                  navigator.clipboard.writeText(`https://t.me/PaybioBot/app?startapp=${creator?.telegram_id || ''}`);
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
        </div>
      )}

      {/* ─── SHARE STORE & PARTNER BLOCK ─── */}
      <div style={{ padding: '0 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button 
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
            onClick={handleShareAffiliateLink}
            className="btn-secondary"
            style={{ 
              padding: '10px', 
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            🤝 {lang === 'ru' ? 'Пригласить и заработать 10%' : 'Invite & Earn 10%'}
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

      {/* ─── PRODUCT LIST SECTION ─── */}
      <div style={{ padding: '0 16px 80px' }}>
        <p className="section-header" style={{ marginBottom: '14px' }}>{t.storeCatalog}</p>
        
        {/* Promoted Carousel */}
        {promotedProducts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <p className="section-header" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ffd700' }}>
              <span>🔥</span> {lang === 'ru' ? 'РЕКОМЕНДУЕМЫЕ' : 'PROMOTED'}
            </p>
            <div className="section-gallery" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '10px', scrollSnapType: 'x mandatory' }}>
              {promotedProducts.map((p, idx) => {
                const styleIdx = idx % coverStyles.length;
                const cover = coverStyles[styleIdx];
                return (
                  <div key={p.id} className="promoted-glow-card animate-fade-up" style={{ width: '80vw', minWidth: '80vw', maxWidth: '80vw', scrollSnapAlign: 'start', flexShrink: 0 }} onClick={() => onSelect(p.id)}>
                    <div className="large-product-cover" style={p.cover_url ? { backgroundImage: `url("${p.cover_url}")`, height: '110px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : { background: cover.bg, height: '110px' }}>
                      {!p.cover_url && <div className="large-product-icon">{cover.icon}</div>}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--tg-text)' }}>{p.title}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--tg-accent)' }}>${p.price_fiat}</span>
                        <span style={{ fontSize: '11px', color: 'var(--tg-hint)' }}>⭐️ {p.price_stars}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Catalog Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {sectionOrder.map((sectionName, secIdx) => {
            const secProducts = groupedProducts[sectionName] || [];
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
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
                  <div className="section-gallery" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '10px', scrollSnapType: 'x mandatory' }}>
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
                      />
                    ))}
                    {secProducts.length === 1 && (
                      <div
                        onClick={isOwner ? () => handleOpenCreateProduct(sectionName) : undefined}
                        className="large-product-card animate-fade-up"
                        style={{
                          width: '80vw',
                          minWidth: '80vw',
                          maxWidth: '80vw',
                          height: '215px',
                          scrollSnapAlign: 'start',
                          flexShrink: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed var(--tg-border)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 'var(--radius-xl)',
                          cursor: isOwner ? 'pointer' : 'default'
                        }}
                      >
                        {isOwner ? (
                          <>
                            <div style={{ fontSize: '36px', color: 'var(--tg-hint)', fontWeight: 'bold' }}>＋</div>
                            <div style={{ fontSize: '12px', color: 'var(--tg-hint)', marginTop: '4px', fontWeight: 600 }}>
                              {lang === 'ru' ? 'Добавить товар' : 'Add Product'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '36px', color: 'var(--tg-hint)', fontWeight: 'bold' }}>✨</div>
                            <div style={{ fontSize: '12px', color: 'var(--tg-hint)', marginTop: '4px', fontWeight: 600 }}>
                              {lang === 'ru' ? 'Скоро новые товары!' : 'More products coming soon!'}
                            </div>
                          </>
                        )}
                      </div>
                    )}
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

              {prodType === 'VOUCHER' && (
                <div className="bottom-sheet-form-group animate-fade-in">
                  <label className="bottom-sheet-label">
                    {lang === 'ru' ? 'Лимит билетов' : 'Max Ticket Limit'}
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

              <button type="submit" className="btn-primary" style={{ marginTop: '14px' }} disabled={isAdding}>
                {isAdding 
                  ? (editingProduct ? 'Saving...' : t.addingProduct) 
                  : (editingProduct ? 'Save Changes ✓' : t.addProductBtn)
                }
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

  // Catalog customization states
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [sectionsList, setSectionsList] = useState<string[]>(['DIGITAL', 'VOUCHER', 'BOOKING']);
  const [sectionOrder, setSectionOrder] = useState<string[]>(['DIGITAL', 'VOUCHER', 'BOOKING']);
  const [productSections, setProductSections] = useState<Record<string, string>>({});
  const [currentScreen, setCurrentScreen] = useState<'CATALOG' | 'SETTINGS'>('CATALOG');

  // Premium modal state
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isProductReviewsOpen, setIsProductReviewsOpen] = useState(false);

  // Stars purchase assistant states
  const [isStarsHelpOpen, setIsStarsHelpOpen] = useState(false);
  const [isPremiumStarsHelpOpen, setIsPremiumStarsHelpOpen] = useState(false);

  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeStatus, setPromoCodeStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

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
  const [dbBookings, setDbBookings] = useState<{ id: string; start: string; end: string; order_id: string | null; status: string }[]>([]);
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

  // Viewport Zoom Lock
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    let lastTouchTime = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchTime < 300) {
        e.preventDefault();
      }
      lastTouchTime = now;
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
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
    getTWA().then((WebApp) => {
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

    const isUuid = (str: string | null): boolean => {
      if (!str) return false;
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    };

    const isNumeric = (str: string | null): boolean => {
      if (!str) return false;
      return /^\d+$/.test(str);
    };

    let detectedPid: string | null = null;
    let detectedCreatorTgId: number | null = null;

    if (rawPid) {
      if (rawPid.startsWith('ref_')) {
        const refIdStr = rawPid.substring(4);
        if (typeof window !== 'undefined') {
          localStorage.setItem('paybio_referrer_tg_id', refIdStr);
        }
        if (isNumeric(refIdStr)) {
          detectedCreatorTgId = Number(refIdStr);
        }
      } else if (isNumeric(rawPid)) {
        detectedCreatorTgId = Number(rawPid);
      } else if (isUuid(rawPid)) {
        detectedPid = rawPid;
      }
    }
    
    if (detectedPid) {
      setProductId(detectedPid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('paybio_current_product_id', detectedPid);
      }
    } else {
      setProductId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paybio_current_product_id');
      }
    }

    const testId = urlParams.get('buyer_tg_id');
    if (testId) setBuyerTgId(Number(testId));

    getTWA().then((webapp) => {
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

      let activeCreatorTgId = detectedCreatorTgId;
      const startParam = webapp.initDataUnsafe?.start_param;
      if (startParam) {
        if (startParam.startsWith('ref_')) {
          const refIdStr = startParam.substring(4);
          if (typeof window !== 'undefined') {
            localStorage.setItem('paybio_referrer_tg_id', refIdStr);
          }
          if (isNumeric(refIdStr)) {
            activeCreatorTgId = Number(refIdStr);
          }
          setProductId(null);
        } else if (isNumeric(startParam)) {
          activeCreatorTgId = Number(startParam);
          setProductId(null);
        } else if (isUuid(startParam)) {
          setProductId(startParam);
          // Sync URL param as well
          const url = new URL(window.location.href);
          url.searchParams.set('product_id', startParam);
          window.history.replaceState(null, '', url.toString());
        }
      }

      const user = webapp.initDataUnsafe?.user;
      if (user?.id) {
        setBuyerTgId(user.id);
        if (activeCreatorTgId === null) {
          setCreatorTgId(user.id);
        } else {
          setCreatorTgId(activeCreatorTgId);
        }
      } else {
        // No TG user (e.g. browser preview) — use URL param or 0
        const urlParams2 = new URLSearchParams(window.location.search);
        const urlCreator = urlParams2.get('creator_tg_id');
        if (activeCreatorTgId !== null) {
          setCreatorTgId(activeCreatorTgId);
        } else {
          setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
        }
      }
    }).catch(() => {
      // SDK failed — resolve with 0 so loadData can proceed
      const urlParams2 = new URLSearchParams(window.location.search);
      const urlCreator = urlParams2.get('creator_tg_id');
      if (detectedCreatorTgId !== null) {
        setCreatorTgId(detectedCreatorTgId);
      } else {
        setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
      }
    });
  }, []);

  const fetchBusySlotsForProduct = useCallback(async (prodId: string) => {
    setIsLoadingBusySlots(true);
    try {
      const res = await fetch(`/api/calendar/busy?product_id=${prodId}`);
      const data = await res.json();
      if (data.success) {
        if (data.busySlots) setBusySlots(data.busySlots);
        if (data.bookings) setDbBookings(data.bookings);
      }
    } catch (e) {
      console.error('Failed to fetch busy slots:', e);
    } finally {
      setIsLoadingBusySlots(false);
    }
  }, []);

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
      setStarredIds(pc.starred_products || []);
      setSectionsList(pc.custom_sections || ['DIGITAL', 'VOUCHER', 'BOOKING']);
      setSectionOrder(pc.section_order || ['DIGITAL', 'VOUCHER', 'BOOKING']);
      setProductSections(pc.product_sections || {});
    }
  }, [creator]);

  const refreshCreatorData = useCallback(async () => {
    const activeTgId = creator?.telegram_id || creatorTgId;
    if (!activeTgId) return;
    try {
      const res = await fetch(`/api/store/list?creator_tg_id=${activeTgId}`);
      const data = await res.json();
      if (data.success) {
        if (data.creator) setCreator(data.creator);
        if (data.products) setProductsList(data.products);
      }
    } catch (err) {
      console.error('Error refreshing creator:', err);
    }
  }, [creator, creatorTgId]);

  // Premium activation (legacy toggle, kept for compatibility/manual triggers)
  const handleActivatePremium = useCallback(async () => {
    if (!creator) return;
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/store/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, action: 'activate', is_premium: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshCreatorData();
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
  }, [creator, lang, t]);

  const handleBuyPremiumWithStars = useCallback(async (isSubscription = false) => {
    if (!creator) return;
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/checkout/premium-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, is_subscription: isSubscription }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert(data.error || 'Failed to generate Premium invoice.');
        return;
      }

      const WebApp = await getTWA();
      WebApp.openInvoice(data.invoice_link, async (status: string) => {
        if (status === 'paid') {
          showAlert(lang === 'ru' ? '🎉 Премиум успешно активирован!' : '🎉 Premium activated successfully!');
          await refreshCreatorData();
          setIsPremiumOpen(false);
        } else {
          // Check if we are in local dev mode (running outside Telegram) to simulate payment
          const isLocalMock = !(window as any).Telegram?.WebApp?.initData;
          if (isLocalMock) {
            const confirmSim = window.confirm(
              lang === 'ru'
                ? 'Вы находитесь в режиме локальной разработки. Симулировать успешную оплату Stars?'
                : 'You are in local development mode. Simulate successful Stars payment?'
            );
            if (confirmSim) {
              const starsRes = await fetch('/api/store/premium', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: creator.id, action: 'stars' }),
              });
              if (starsRes.ok) {
                showAlert(lang === 'ru' ? '🎉 Премиум успешно активирован!' : '🎉 Premium activated successfully!');
                await refreshCreatorData();
                setIsPremiumOpen(false);
              }
            }
          } else {
            await refreshCreatorData();
            showAlert(lang === 'ru' ? `Статус оплаты: ${status}` : `Payment status: ${status}`);
          }
        }
      });
    } catch (e: any) {
      console.error(e);
      showAlert(lang === 'ru' ? 'Ошибка запуска оплаты.' : 'Error initiating payment.');
    } finally {
      setIsUpgrading(false);
    }
  }, [creator, lang, refreshCreatorData]);

  const handleApplyPromoCode = useCallback(async () => {
    if (!creator || !promoCodeInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoCodeStatus({ type: null, message: '' });
    try {
      const res = await fetch('/api/store/premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: creator.id,
          action: 'promo',
          code: promoCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoCodeStatus({
          type: 'success',
          message: lang === 'ru'
            ? `✓ Промокод применен! Активировано ${data.duration_days} дней Premium.`
            : `✓ Promo code applied! Activated ${data.duration_days} days of Premium.`,
        });
        showAlert(
          lang === 'ru'
            ? `🎉 Промокод применен! Активировано ${data.duration_days} дней Premium.`
            : `🎉 Promo code applied! Activated ${data.duration_days} days of Premium.`
        );
        setPromoCodeInput('');
        await refreshCreatorData();
        setTimeout(() => {
          setIsPremiumOpen(false);
          setPromoCodeStatus({ type: null, message: '' });
        }, 2000);
      } else {
        setPromoCodeStatus({
          type: 'error',
          message: data.error || (lang === 'ru' ? 'Неверный промокод' : 'Invalid promo code'),
        });
      }
    } catch (err: any) {
      setPromoCodeStatus({
        type: 'error',
        message: err.message || (lang === 'ru' ? 'Ошибка запроса' : 'Request error'),
      });
    } finally {
      setIsApplyingPromo(false);
    }
  }, [creator, promoCodeInput, lang, refreshCreatorData]);

  const handleSaveSettings = useCallback(async (
    name: string,
    description: string,
    avatar: string,
    banner: string,
    socials: any,
    ton: string,
    p2p: string,
    p2pList: any[],
    calendarProvider: string,
    icsUrl: string
  ) => {
    if (!creator) return;
    try {
      const pc = creator.profile_customization || {};
      const pd = creator.payment_details || {};
      
      const newCustomization = {
        ...pc,
        store_name: name,
        store_description: description,
        avatar_url: avatar,
        banner_url: banner,
        social_links: socials,
      };
      
      const newPaymentDetails = {
        ...pd,
        ton: ton,
        p2p: p2p,
        p2p_list: p2pList,
        calendar_provider: calendarProvider,
        ics_url: icsUrl
      };
      
      const res = await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: creator.id,
          customization: newCustomization,
          payment_details: newPaymentDetails
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(lang === 'ru' ? '✓ Все настройки сохранены!' : '✓ All settings saved successfully!');
        setStoreName(name);
        setStoreDescription(description);
        setStoreAvatar(avatar);
        setStoreBanner(banner);
        setSocialLinks(socials);
        setCreator((prev) => prev ? { ...prev, profile_customization: newCustomization, payment_details: newPaymentDetails } : null);
        setCurrentScreen('CATALOG');
      } else {
        showAlert(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error saving settings.');
    }
  }, [creator, lang]);

  // Direct product creation in frontend
  const handleAddProduct = useCallback(async (
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType = 'DIGITAL',
    section = 'DIGITAL'
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
        const newProd = data.product;
        setProductsList((prev) => [...prev, newProd]);
        
        // Save product section mapping
        const newMapping = { ...productSections, [newProd.id]: section };
        setProductSections(newMapping);
        if (creator) {
          const pc = creator.profile_customization || {};
          const updatedCustom = {
            ...pc,
            product_sections: newMapping
          };
          await fetch('/api/store/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
          });
        }

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
  }, [creator, creatorTgId, productSections, lang]);

  const handleDeleteProduct = useCallback(async (prodId: string): Promise<boolean> => {
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
  }, []);

  const handleUpdateProduct = useCallback(async (
    prodId: string,
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType?: string,
    section = 'DIGITAL'
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
        
        // Save product section mapping
        const newMapping = { ...productSections, [prodId]: section };
        setProductSections(newMapping);
        if (creator) {
          const pc = creator.profile_customization || {};
          const updatedCustom = {
            ...pc,
            product_sections: newMapping
          };
          await fetch('/api/store/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: creator.id, customization: updatedCustom })
          });
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update product:', err);
      return false;
    }
  }, [creator, productSections]);

  // Stars payment
  const handleStarsPayment = useCallback(async () => {
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

      const WebApp = await getTWA();
      WebApp.openInvoice(data.invoice_link, (status: string) => {
        if (status === 'paid') showAlert(t.fileDelivered);
        else showAlert(`Payment status: ${status}`);
      });
    } catch (e: any) {
      showAlert('Error initiating payment.');
    }
  }, [product, bookingDate, bookingTime, buyerTgId, lang, t]);

  const handleBuyDirect = useCallback(async () => {
    if (!product) return;
    const creatorUsername = product.creator?.username;
    const contactUrl = creatorUsername 
      ? `https://t.me/${creatorUsername}`
      : `tg://user?id=${product.creator?.telegram_id}`;
    
    const text = lang === 'ru'
      ? `Привет! Я хочу купить твой товар: "${product.title}"`
      : `Hi! I want to buy your product: "${product.title}"`;
      
    try {
      const WebApp = await getTWA();
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
  }, [product, lang]);

  // P2P verification
  const handleVerifyReceipt = useCallback(async (e: React.FormEvent) => {
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
  }, [product, file, bookingDate, bookingTime, buyerTgId]);

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
          
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          starredIds={starredIds}
          setStarredIds={setStarredIds}
          sectionsList={sectionsList}
          setSectionsList={setSectionsList}
          sectionOrder={sectionOrder}
          setSectionOrder={setSectionOrder}
          productSections={productSections}
          setProductSections={setProductSections}
          onSaveSettings={handleSaveSettings}
          busySlots={busySlots}
          dbBookings={dbBookings}
          fetchBusySlotsForProduct={fetchBusySlotsForProduct}
          buyerTgId={buyerTgId}
        />
        
        <PremiumFlow
          isOpen={isPremiumOpen}
          onClose={() => setIsPremiumOpen(false)}
          lang={lang}
          t={t}
          isUpgrading={isUpgrading}
          onBuyPremiumWithStars={handleBuyPremiumWithStars}
          isPremiumStarsHelpOpen={isPremiumStarsHelpOpen}
          onTogglePremiumStarsHelp={() => setIsPremiumStarsHelpOpen(!isPremiumStarsHelpOpen)}
          onOpenLink={handleOpenLink}
          promoCodeInput={promoCodeInput}
          onPromoCodeInputChange={setPromoCodeInput}
          onApplyPromoCode={handleApplyPromoCode}
          promoCodeStatus={promoCodeStatus}
          isApplyingPromo={isApplyingPromo}
        />
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
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px 16px',
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
                backgroundImage: `url("${product.cover_url}")`,
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
              
              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffd700',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                className="animate-scale-in"
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
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
                backgroundImage: `url("${product.cover_url}")`,
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
              
              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffd700',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                className="animate-scale-in"
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
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
                backgroundImage: `url("${product.cover_url}")`,
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
              
              <div 
                onClick={() => setIsProductReviewsOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '5px 10px',
                  background: 'rgba(255, 215, 0, 0.08)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffd700',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease'
                }}
                className="animate-scale-in"
              >
                <span>⭐️</span>
                <span>{lang === 'ru' ? 'РЕЙТИНГ / ОТЗЫВЫ' : 'RATING / REVIEWS'}</span>
              </div>
              
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
                bookings={dbBookings}
                bookingDate={bookingDate}
                setBookingDate={setBookingDate}
                bookingTime={bookingTime}
                setBookingTime={setBookingTime}
                lang={lang}
                isOwner={!!isOwner}
                productId={product.id}
                userTgId={buyerTgId}
                onRefreshBusySlots={() => fetchBusySlotsForProduct(product.id)}
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

            {/* Stars Purchase Assistant for Product Checkout */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--tg-border)', paddingTop: '10px' }}>
              <button 
                type="button"
                onClick={() => setIsStarsHelpOpen(!isStarsHelpOpen)}
                style={{
                  background: 'none', border: 'none', color: 'var(--tg-link)',
                  fontSize: '12px', cursor: 'pointer', padding: '4px 0',
                  display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto',
                  fontWeight: 500
                }}
              >
                {isStarsHelpOpen ? '▲' : '▼'} {lang === 'ru' ? 'Как получить Telegram Stars?' : 'How to get Telegram Stars?'}
              </button>
              
              {isStarsHelpOpen && (
                <div style={{
                  marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--tg-border)', borderRadius: '8px',
                  fontSize: '12px', lineHeight: 1.5, textAlign: 'left'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                    {lang === 'ru' ? 'Купить Звёзды можно двумя способами:' : 'You can buy Stars in two ways:'}
                  </p>
                  <ol style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                      <button 
                        type="button"
                        onClick={() => handleOpenLink('https://fragment.com/stars')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--tg-link)', fontWeight: 600, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                      >
                        Fragment.com/stars
                      </button>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--tg-hint)', marginTop: '2px' }}>
                        {lang === 'ru' 
                          ? '💡 Дешевле! Оплата криптовалютой TON / кошельком TON.' 
                          : '💡 Cheaper! Pay with TON cryptocurrency / TON wallet.'}
                      </span>
                    </li>
                    <li>
                      <button 
                        type="button"
                        onClick={() => handleOpenLink('tg://settings')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--tg-link)', fontWeight: 600, fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left' }}
                      >
                        {lang === 'ru' ? 'Настройки Telegram' : 'Telegram Settings'}
                      </button>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--tg-hint)', marginTop: '2px' }}>
                        {lang === 'ru'
                          ? '📱 Быстрая покупка через App Store / Google Play на мобильном.'
                          : '📱 Fast top-up via App Store / Google Play on mobile.'}
                      </span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
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

      {/* ─── BOTTOM SHEET: PRODUCT REVIEWS ─── */}
      <div className={`bottom-sheet-overlay ${isProductReviewsOpen ? 'active' : ''}`} onClick={() => setIsProductReviewsOpen(false)}>
        <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85svh', overflowY: 'auto' }}>
          <div className="bottom-sheet-handle" />
          <button 
            type="button" 
            onClick={() => setIsProductReviewsOpen(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tg-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', zIndex: 10
            }}
          >
            ✕
          </button>
          <ReviewsDashboard 
            creatorId={product.creator_id} 
            productId={product.id} 
            buyerTgId={buyerTgId} 
            lang={lang} 
            t={t} 
            hasBought={!!product.has_bought} 
          />
        </div>
      </div>
    </div>
  );
}


