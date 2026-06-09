'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Product, Creator } from '@/types/store';
import { getTWA, showAlert, cleanProductId, handleOpenLink } from '@/utils/telegram';
import { TRANSLATIONS } from '@/lib/translations';

// --- DEMO MODE DATA AND CONSTANTS ---
export const DEMO_CREATOR: Creator = {
  id: 'demo-welcome-store',
  telegram_id: 0,
  username: 'PayBioDemo',
  is_premium: true, // show all premium features
  payment_details: {
    ton: 'EQC2...demo_address',
    p2p: '4276 0000 0000 0000',
    p2p_list: [
      { id: 'p2p-demo', label: 'Тестовая Карта', card: '4276 0000 0000 0000' }
    ],
    ton_list: [
      { id: 'ton-demo', label: 'Тестовый TON', address: 'EQC2...demo_address' }
    ]
  },
  profile_customization: {
    store_name: '🚀 Мой Демо-Магазин',
    store_description: 'Попробуй купить любой тестовый товар за 1 Telegram Star, чтобы увидеть процесс оплаты и моментальную выдачу товара!',
    avatar_url: '',
    banner_url: '',
    onboarding_completed: true
  }
};

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-product-1',
    creator_id: 'demo-welcome-store',
    title: 'Физический мерч TMZ 👕',
    description: 'Лимитированная футболка PayBio. Демонстрирует доставку физических товаров с заполнением формы СДЭК.',
    price_fiat: 1.00,
    price_stars: 1,
    content_url: 'https://paybio.link/merch_template.pdf',
    cover_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
    product_type: 'DIGITAL',
    sub_type: 'PHYSICAL',
    creator: DEMO_CREATOR
  },
  {
    id: 'demo-product-2',
    creator_id: 'demo-welcome-store',
    title: 'Гайд: Запуск за 60 секунд 📖',
    description: 'Пошаговое руководство с секретами вирусного маркетинга. Моментально выдается после оплаты.',
    price_fiat: 1.00,
    price_stars: 1,
    content_url: 'https://paybio.link/guide_demo.pdf',
    cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=60',
    product_type: 'DIGITAL',
    sub_type: null,
    creator: DEMO_CREATOR
  },
  {
    id: 'demo-product-3',
    creator_id: 'demo-welcome-store',
    title: 'Воркаут-интенсив: Билет 🎟️',
    description: 'Входной билет на онлайн-интенсив. Генерирует уникальный QR-код для контроля посещаемости на входе.',
    price_fiat: 1.00,
    price_stars: 1,
    content_url: 'TICKET_VOUCHER_DEMO',
    cover_url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=500&auto=format&fit=crop&q=60',
    product_type: 'VOUCHER',
    sub_type: null,
    creator: DEMO_CREATOR
  },
  {
    id: 'demo-product-4',
    creator_id: 'demo-welcome-store',
    title: 'Консультация: Разбор магазина 📅',
    description: 'Личная 30-минутная ZOOM-сессия с экспертом PayBio. Включает выбор даты и времени на встроенном календаре.',
    price_fiat: 1.00,
    price_stars: 1,
    content_url: 'BOOKING_DEMO_MEETING',
    cover_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop&q=60',
    product_type: 'BOOKING',
    sub_type: null,
    creator: DEMO_CREATOR
  }
];

export function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);
  return { copied, copy };
}

export function useStorefront() {
  const [productId, setProductId] = useState<string | null>(null);
  const [buyerTgId, setBuyerTgId] = useState<number>(0);
  // null = SDK not yet resolved, number = resolved (0 = no TG user)
  const [creatorTgId, setCreatorTgId] = useState<number | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDemoPaymentSuccessOpen, setIsDemoPaymentSuccessOpen] = useState(false);

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
  const [currentScreen, setCurrentScreen] = useState<'CATALOG' | 'SETTINGS' | 'PARTNER' | 'CALENDAR'>('CATALOG');
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Premium modal state
  const [isPremiumOpen, setIsPremiumOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isProductReviewsOpen, setIsProductReviewsOpen] = useState(false);
  const [adminWallets, setAdminWallets] = useState<any>(null);

  // Stars purchase assistant states
  const [isStarsHelpOpen, setIsStarsHelpOpen] = useState(false);
  const [isPremiumStarsHelpOpen, setIsPremiumStarsHelpOpen] = useState(false);

  // Promo code states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeStatus, setPromoCodeStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'ton' | 'p2p' | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<'card' | 'stars' | 'crypto' | 'other' | null>(null);
  const [cryptoSubMethod, setCryptoSubMethod] = useState<'ton' | 'usdt_trc20' | 'usdt_bep20'>('ton');
  const [checkoutP2pIdx, setCheckoutP2pIdx] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasBoughtInSession, setHasBoughtInSession] = useState(false);

  // Buyer shipping form states
  const [paidOrderId, setPaidOrderId] = useState<string | null>(null);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [shippingSubmitted, setShippingSubmitted] = useState(false);
  const [isSubmittingShipping, setIsSubmittingShipping] = useState(false);
  const [shipFullName, setShipFullName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipMethod, setShipMethod] = useState('SDEK');
  const [shipAddress, setShipAddress] = useState('');

  // Booking states
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [busySlots, setBusySlots] = useState<{ start: string; end: string }[]>([]);
  const [dbBookings, setDbBookings] = useState<{ id: string; start: string; end: string; order_id: string | null; status: string }[]>([]);
  const [isLoadingBusySlots, setIsLoadingBusySlots] = useState(false);

  const [selectedTonIdx, setSelectedTonIdx] = useState(0);
  const [selectedP2pIdx, setSelectedP2pIdx] = useState(0);

  const { copied, copy } = useCopy();

  const productsListRef = useRef(productsList);
  const productRef = useRef(product);

  useEffect(() => {
    productsListRef.current = productsList;
  }, [productsList]);

  useEffect(() => {
    productRef.current = product;
  }, [product]);

  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  // Top-level, TDZ-safe variable definitions for product/creator state
  const isStorePremium = useMemo(() => {
    return !!(product?.creator?.is_premium ?? creator?.is_premium);
  }, [product, creator]);

  const tonList = useMemo(() => {
    return (isStorePremium && product?.creator?.payment_details?.ton_list) || (creator?.payment_details?.ton_list) || [];
  }, [isStorePremium, product, creator]);

  const p2pList = useMemo(() => {
    return (product?.creator?.payment_details?.p2p_list) || (creator?.payment_details?.p2p_list) || [];
  }, [product, creator]);

  const tonDetails = useMemo(() => {
    return tonList.length > 0 && selectedTonIdx < tonList.length
      ? tonList[selectedTonIdx].address 
      : (product?.creator?.payment_details?.ton || creator?.payment_details?.ton || 'No TON wallet configured');
  }, [tonList, selectedTonIdx, product, creator]);

  const p2pDetails = useMemo(() => {
    return p2pList.length > 0 && selectedP2pIdx < p2pList.length
      ? p2pList[selectedP2pIdx].card 
      : (product?.creator?.payment_details?.p2p || creator?.payment_details?.p2p || 'No card details configured');
  }, [p2pList, selectedP2pIdx, product, creator]);

  const tonAmount = useMemo(() => {
    return product ? (product.price_fiat / 7.0).toFixed(2) : '0';
  }, [product]);

  const handleSelectProduct = useCallback((id: string | null) => {
    setProductId(id);
    if (id) {
      const found = productsList.find(p => p.id === id);
      if (found) {
        setProduct(found);
      }
    } else {
      setProduct(null);
    }
    setIsPaymentSheetOpen(false);
    setCheckoutMethod(null);
    setFile(null);
    setVerifyError(null);
    setVerifySuccess(false);
    setExtractedData(null);
    setVerifying(false);
    setActiveOrderId(null);
    setHasBoughtInSession(false);
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
        window.history.pushState(null, '', url.toString());
      } else {
        url.searchParams.delete('product_id');
        url.searchParams.delete('startapp');
        url.searchParams.delete('tgWebAppStartParam');
        window.history.replaceState(null, '', url.toString());
      }
    }
  }, [productsList]);

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
      if (!WebApp) return;
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

    if (rawPid === 'welcome_demo') {
      setIsDemoMode(true);
      setLoading(false);
      setCreator(DEMO_CREATOR);
      setCreatorTgId(0);
      setProductsList(DEMO_PRODUCTS);
      return;
    }

    if (rawPid) {
      if (rawPid.startsWith('ref_')) {
        const refIdStr = rawPid.substring(4);
        if (typeof window !== 'undefined') {
          localStorage.setItem('paybio_referrer_tg_id', refIdStr);
        }
        if (isNumeric(refIdStr)) {
          detectedCreatorTgId = Number(refIdStr);
        }
      } else if (rawPid.includes('_ref_')) {
        const parts = rawPid.split('_ref_');
        let prodPart = parts[0];
        const refPart = parts[1];
        if (prodPart.startsWith('p_')) {
          prodPart = prodPart.substring(2);
        } else if (prodPart.startsWith('prod_')) {
          prodPart = prodPart.substring(5);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('paybio_referrer_tg_id', refPart);
        }
        if (isUuid(prodPart)) {
          detectedPid = prodPart;
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

    const urlCreatorParam = urlParams.get('creator_tg_id');
    if (detectedCreatorTgId !== null) {
      setCreatorTgId(detectedCreatorTgId);
    } else if (detectedPid) {
      setCreatorTgId(0);
    } else if (urlCreatorParam) {
      setCreatorTgId(Number(urlCreatorParam));
    }

    getTWA().then((webapp) => {
      if (!webapp) {
        // Fallback if SDK failed
        const urlParams2 = new URLSearchParams(window.location.search);
        const urlCreator = urlParams2.get('creator_tg_id');
        if (detectedCreatorTgId !== null) {
          setCreatorTgId(detectedCreatorTgId);
        } else {
          setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
        }
        return;
      }
      webapp.ready();
      webapp.expand();
      try {
        if ('isVerticalSwipesEnabled' in webapp) {
          (webapp as any).isVerticalSwipesEnabled = false;
        }
      } catch (e) {
        console.error('Failed to disable vertical swipes:', e);
      }
      
      const tgLang = webapp.initDataUnsafe?.user?.language_code;
      if (tgLang && tgLang.toLowerCase().startsWith('ru')) {
        setLang('ru');
      } else {
        setLang('en');
      }

      let activeCreatorTgId = detectedCreatorTgId;
      const startParam = webapp.initDataUnsafe?.start_param;
      if (startParam) {
        if (startParam === 'welcome_demo') {
          setIsDemoMode(true);
          setLoading(false);
          setCreator(DEMO_CREATOR);
          setCreatorTgId(0);
          setProductsList(DEMO_PRODUCTS);
          return;
        } else if (startParam.startsWith('ref_')) {
          const refIdStr = startParam.substring(4);
          if (typeof window !== 'undefined') {
            localStorage.setItem('paybio_referrer_tg_id', refIdStr);
          }
          if (isNumeric(refIdStr)) {
            activeCreatorTgId = Number(refIdStr);
          }
          setProductId(null);
        } else if (startParam.includes('_ref_')) {
          const parts = startParam.split('_ref_');
          let prodPart = parts[0];
          const refPart = parts[1];
          if (prodPart.startsWith('p_')) {
            prodPart = prodPart.substring(2);
          } else if (prodPart.startsWith('prod_')) {
            prodPart = prodPart.substring(5);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('paybio_referrer_tg_id', refPart);
          }
          if (isUuid(prodPart)) {
            setProductId(prodPart);
            const url = new URL(window.location.href);
            url.searchParams.set('product_id', prodPart);
            window.history.replaceState(null, '', url.toString());
          }
        } else if (isNumeric(startParam)) {
          activeCreatorTgId = Number(startParam);
          setProductId(null);
        } else if (isUuid(startParam)) {
          setProductId(startParam);
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
        const urlParams2 = new URLSearchParams(window.location.search);
        const urlCreator = urlParams2.get('creator_tg_id');
        if (activeCreatorTgId !== null) {
          setCreatorTgId(activeCreatorTgId);
        } else {
          setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
        }
      }
    }).catch(() => {
      const urlParams2 = new URLSearchParams(window.location.search);
      const urlCreator = urlParams2.get('creator_tg_id');
      if (detectedCreatorTgId !== null) {
        setCreatorTgId(detectedCreatorTgId);
      } else {
        setCreatorTgId(urlCreator ? Number(urlCreator) : 0);
      }
    });
  }, []);

  // Fetch administrator's payment wallets on mount for Premium checkout
  useEffect(() => {
    fetch('/api/admin/wallets')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.wallets) {
          setAdminWallets(data.wallets);
        }
      })
      .catch(err => console.error('Failed to pre-fetch admin wallets:', err));
  }, []);

  const handleBuyPremium = useCallback(() => {
    setIsPremiumOpen(false);
    
    const premiumProd: Product = {
      id: 'premium_virtual',
      creator_id: 'admin_system',
      title: lang === 'ru' ? 'Подписка PayBio Premium' : 'PayBio Premium Subscription',
      description: lang === 'ru' ? 'Разблокировка всех функций витрины на 30 дней.' : 'Unlock all storefront tools for 30 days.',
      price_fiat: 10.00,
      price_stars: 500,
      content_url: 'PREMIUM_SUBSCRIPTION',
      cover_url: '',
      product_type: 'DIGITAL',
      creator: {
        id: 'admin_system',
        telegram_id: 999999999,
        username: 'PayBioAdmin',
        is_premium: true,
        payment_details: adminWallets || { ton: '', p2p: '', p2p_list: [], usdt_trc20: '', usdt_bep20: '', other: '' }
      }
    };
    
    setProduct(premiumProd);
    setBookingDate('');
    setBookingTime('');
    setIsPaymentSheetOpen(true);
    setCheckoutMethod(null);
    setFile(null);
    setVerifyError(null);
    setVerifySuccess(false);
    setExtractedData(null);
    setVerifying(false);
    setActiveOrderId(null);
  }, [adminWallets, lang]);

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

  // Fetch data
  useEffect(() => {
    if (creatorTgId === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    async function loadData() {
      if (isDemoMode) {
        setLoading(false);
        return;
      }
      const currentProductsList = productsListRef.current;
      const currentProduct = productRef.current;
      const needsLoader = productId 
        ? !currentProduct && !currentProductsList.some(p => p.id === productId)
        : currentProductsList.length === 0;

      if (needsLoader) {
        setLoading(true);
      }
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
          let refParam = '';
          if (typeof window !== 'undefined') {
            const savedRef = localStorage.getItem('paybio_referrer_tg_id');
            if (savedRef) {
              refParam = `&referrer_tg_id=${encodeURIComponent(savedRef)}`;
            }
          }

          const res = await fetch(`/api/store/list?product_id=${productId}&buyer_tg_id=${bTgId}&buyer_username=${encodeURIComponent(bUsername)}&buyer_name=${encodeURIComponent(bName)}${refParam}`, { signal });
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
          const urlParams = new URLSearchParams(window.location.search);
          const cTgId = urlParams.get('creator_tg_id') || String(creatorTgId);

          let refParam = '';
          if (typeof window !== 'undefined') {
            const savedRef = localStorage.getItem('paybio_referrer_tg_id');
            if (savedRef) {
              refParam = `&referrer_tg_id=${encodeURIComponent(savedRef)}`;
            }
          }

          const res = await fetch(`/api/store/list?creator_tg_id=${cTgId}&buyer_tg_id=${buyerTgId}${refParam}`, { signal });
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
  }, [productId, creatorTgId, buyerTgId, fetchBusySlotsForProduct, isDemoMode]);

  // Load custom shop customization settings
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
  }, [creator, lang]);

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
  }, [creator, refreshCreatorData, t.premiumUnlocked]);

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
      if (!WebApp) return;
      WebApp.openInvoice(data.invoice_link, async (status: string) => {
        if (status === 'paid') {
          showAlert(lang === 'ru' ? '🎉 Премиум успешно активирован!' : '🎉 Premium activated successfully!');
          await refreshCreatorData();
          setIsPremiumOpen(false);
        } else {
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
        const isDeactivated = !!data.deactivated;
        const isLifetime = data.duration_days === -1;
        const successMsg = isDeactivated
          ? (lang === 'ru' ? '✓ Премиум-подписка деактивирована.' : '✓ Premium subscription deactivated.')
          : isLifetime
            ? (lang === 'ru' ? '♾️ Пожизненный Premium активирован! Добро пожаловать навсегда.' : '♾️ Lifetime Premium activated! Welcome forever.')
            : (lang === 'ru'
                ? `✓ Промокод применен! Активировано ${data.duration_days} дней Premium.`
                : `✓ Promo code applied! Activated ${data.duration_days} days of Premium.`);
        setPromoCodeStatus({ type: 'success', message: successMsg });
        showAlert(
          isDeactivated
            ? (lang === 'ru' ? '🎉 Премиум-подписка отключена.' : '🎉 Premium subscription deactivated.')
            : isLifetime
              ? (lang === 'ru' ? '♾️ Пожизненный Premium активирован!' : '♾️ Lifetime Premium activated!')
              : (lang === 'ru'
                  ? `🎉 Промокод применен! Активировано ${data.duration_days} дней Premium.`
                  : `🎉 Promo code applied! Activated ${data.duration_days} days of Premium.`)
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

  const handleCompleteOnboarding = useCallback(async () => {
    if (!creator) return;
    const pc = creator.profile_customization || {};
    const updatedCustom = {
      ...pc,
      onboarding_completed: true,
    };

    setCreator({
      ...creator,
      profile_customization: updatedCustom,
    });
    setForceShowOnboarding(false);
    setIsTutorialOpen(true);

    try {
      await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: creator.id, customization: updatedCustom }),
      });
    } catch (e) {
      console.error('Failed to save onboarding status:', e);
    }
  }, [creator]);

  const handleSaveSettings = useCallback(async (
    name: string,
    description: string,
    avatar: string,
    banner: string,
    socials: any,
    ton: string,
    p2p: string,
    p2pListInput: any[],
    calendarProvider: string,
    icsUrl: string,
    usdtTrc20?: string,
    usdtBep20?: string,
    other?: string,
    adminPaymentDetails?: any
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
        p2p_list: p2pListInput,
        calendar_provider: calendarProvider,
        ics_url: icsUrl,
        usdt_trc20: usdtTrc20 || '',
        usdt_bep20: usdtBep20 || '',
        other: other || ''
      };
      
      const res = await fetch('/api/store/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: creator.id,
          customization: newCustomization,
          payment_details: newPaymentDetails,
          admin_payment_details: adminPaymentDetails
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

  const handleAddProduct = useCallback(async (
    title: string,
    description: string,
    priceFiat: number,
    priceStars?: number,
    contentUrl?: string,
    coverUrl?: string,
    productType = 'DIGITAL',
    section = 'DIGITAL',
    subType: string | null = null
  ): Promise<boolean> => {
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
          product_type: productType,
          sub_type: subType
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newProd = data.product;
        setProductsList((prev) => [...prev, newProd]);
        
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
    section = 'DIGITAL',
    subType: string | null = null
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/store/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: prodId,
          title: title,
          description,
          price_fiat: priceFiat,
          price_stars: priceStars,
          content_url: contentUrl,
          cover_url: coverUrl,
          product_type: productType,
          sub_type: subType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProductsList((prev) => prev.map((p) => p.id === prodId ? { ...p, ...data.product } : p));
        
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

  const handleStarsPayment = useCallback(async () => {
    if (!product || isProcessingPayment) return;
    if (product.id === 'premium_virtual') {
      setIsPaymentSheetOpen(false);
      handleBuyPremiumWithStars(false);
      return;
    }
    if (product.product_type === 'BOOKING') {
      if (!bookingDate || !bookingTime) {
        showAlert(lang === 'ru' ? 'Пожалуйста, выберите дату и время записи.' : 'Please select date and time for the booking.');
        return;
      }
    }
    setIsProcessingPayment(true);
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
      if (!res.ok) {
        showAlert(data.error || 'Failed to create invoice.');
        setIsProcessingPayment(false);
        return;
      }
      const orderId = data.order_id;
      const WebApp = await getTWA();
      if (!WebApp) {
        setIsProcessingPayment(false);
        return;
      }
      setIsPaymentSheetOpen(false);
      WebApp.openInvoice(data.invoice_link, (status: string) => {
        setIsProcessingPayment(false);
        if (status === 'paid') {
          setHasBoughtInSession(true);
          if (product.sub_type === 'PHYSICAL') {
            setPaidOrderId(orderId);
            setShowDeliveryForm(true);
          } else {
            showAlert(t.fileDelivered);
          }
        } else {
          showAlert(`Payment status: ${status}`);
        }
      });
    } catch (e: any) {
      showAlert('Error initiating payment.');
      setIsProcessingPayment(false);
    }
  }, [product, isProcessingPayment, bookingDate, bookingTime, buyerTgId, handleBuyPremiumWithStars, lang, t.fileDelivered]);

  const handleBuyDirect = useCallback(async () => {
    if (!product) return;
    const creatorUsername = product.creator?.username;
    const contactUrl = creatorUsername 
      ? `https://t.me/${creatorUsername}`
      : `tg://user?id=${product.creator?.telegram_id}`;
    
    const productLink = `https://t.me/PaybioBot/app?startapp=p_${product.id}_ref_${product.creator?.telegram_id || ''}`;
    const text = lang === 'ru'
      ? `Привет! Я хочу купить твой товар: "${product.title}"\nСсылка на товар: ${productLink}`
      : `Hi! I want to buy your product: "${product.title}"\nProduct link: ${productLink}`;
      
    try {
      const WebApp = await getTWA();
      if (!WebApp) {
        window.open(contactUrl, '_blank');
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        showAlert(lang === 'ru' 
          ? 'Ссылка и сообщение скопированы! Откроется чат с автором — просто вставьте скопированный текст (зажмите поле ввода -> "Вставить" или Ctrl+V) и отправьте.' 
          : 'Link and message copied! Once the chat opens, paste the copied text (long press the input field -> "Paste" or press Ctrl+V) and send it.');
      }).catch(() => {});
      
      setTimeout(() => {
        WebApp.openTelegramLink(contactUrl);
        setTimeout(() => {
          WebApp.close();
        }, 150);
      }, 1200);
    } catch (e) {
      window.open(contactUrl, '_blank');
    }
  }, [product, lang]);

  const handleSelectPaymentMethod = useCallback(async (method: 'card' | 'crypto') => {
    if (!product) return;
    setCheckoutMethod(method);
    setVerifyError(null);
    setVerifySuccess(false);
    setVerifying(false);
    setActiveOrderId(null);

    if (method === 'card') {
      setCheckoutP2pIdx(0);
    } else if (method === 'crypto') {
      if (product.creator?.payment_details?.ton) setCryptoSubMethod('ton');
      else if (product.creator?.payment_details?.usdt_trc20) setCryptoSubMethod('usdt_trc20');
      else if (product.creator?.payment_details?.usdt_bep20) setCryptoSubMethod('usdt_bep20');
    }

    try {
      const bookingSlot = product.product_type === 'BOOKING' ? {
        start: `${bookingDate}T${bookingTime}:00`,
        end: `${bookingDate}T${bookingTime}:00`
      } : undefined;

      const res = await fetch('/api/checkout/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          buyer_tg_id: buyerTgId,
          booking_slot: bookingSlot,
          payment_method: method === 'crypto' ? 'crypto' : 'p2p'
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveOrderId(data.order_id);
      } else {
        setVerifyError(data.error || 'Failed to initialize order.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Error initializing order.');
    }
  }, [product, bookingDate, bookingTime, buyerTgId]);

  const handleClaimPayment = useCallback(async () => {
    if (!product) return;
    if (product.product_type === 'BOOKING') {
      if (!bookingDate || !bookingTime) {
        showAlert(lang === 'ru' ? 'Пожалуйста, выберите дату и время записи.' : 'Please select date and time for the booking.');
        return;
      }
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(false);

    let currentOrderId = activeOrderId;
    try {
      if (!currentOrderId) {
        const bookingSlot = product.product_type === 'BOOKING' ? {
          start: `${bookingDate}T${bookingTime}:00`,
          end: `${bookingDate}T${bookingTime}:00`
        } : undefined;

        const orderRes = await fetch('/api/checkout/p2p', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: product.id,
            buyer_tg_id: buyerTgId,
            booking_slot: bookingSlot,
            payment_method: checkoutMethod === 'crypto' ? 'crypto' : 'p2p'
          }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.error || 'Failed to initialize order.');
        }
        currentOrderId = orderData.order_id;
        setActiveOrderId(currentOrderId);
      }

      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: currentOrderId }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setVerifySuccess(true);
        setHasBoughtInSession(true);
        if (product.sub_type === 'PHYSICAL') {
          setPaidOrderId(currentOrderId);
          setShowDeliveryForm(true);
        }
      } else {
        throw new Error(result.reason || 'Failed to register payment notification.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Processing error.');
    } finally {
      setVerifying(false);
    }
  }, [product, activeOrderId, bookingDate, bookingTime, buyerTgId, checkoutMethod, lang]);

  const handleShippingSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidOrderId || !shipFullName || !shipPhone || !shipAddress) {
      showAlert(lang === 'ru' ? 'Пожалуйста, заполните все обязательные поля.' : 'Please fill in all required fields.');
      return;
    }
    setIsSubmittingShipping(true);
    try {
      const res = await fetch('/api/vouchers/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: paidOrderId,
          delivery_data: {
            fullName: shipFullName,
            phone: shipPhone,
            shippingMethod: shipMethod,
            addressOrBranch: shipAddress
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShippingSubmitted(true);
        setShowDeliveryForm(false);
        setShipFullName('');
        setShipPhone('');
        setShipMethod('SDEK');
        setShipAddress('');
      } else {
        showAlert(data.error || 'Failed to submit shipping details.');
      }
    } catch (err: any) {
      showAlert(err.message || 'Error saving shipping details.');
    } finally {
      setIsSubmittingShipping(false);
    }
  }, [paidOrderId, shipFullName, shipPhone, shipMethod, shipAddress, lang]);

  const handleActivateRealStore = useCallback(async () => {
    let tgId = buyerTgId;
    let username = '';
    let firstName = '';
    
    if (typeof window !== 'undefined') {
      const WebApp = (window as any).Telegram?.WebApp;
      const user = WebApp?.initDataUnsafe?.user;
      if (user) {
        if (user.id) tgId = Number(user.id);
        username = user.username || '';
        firstName = user.first_name || '';
      }
    }
    
    if (!tgId) {
      showAlert(lang === 'ru' ? 'Ошибка: Telegram ID не найден. Откройте приложение внутри Telegram!' : 'Error: Telegram ID not found. Open the app inside Telegram!');
      return;
    }

    try {
      const res = await fetch('/api/store/demo-activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: tgId,
          username: username,
          store_name: lang === 'ru' ? `Магазин ${firstName || username || tgId}` : `${firstName || username || tgId}'s Store`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert(
          lang === 'ru'
            ? '🎉 Ваш личный магазин успешно создан! Перезапуск...'
            : '🎉 Your personal storefront has been created successfully! Reloading...'
        );
        setIsDemoMode(false);
        if (data.creator) {
          setCreator(data.creator);
          setCreatorTgId(data.creator.telegram_id);
        }
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('startapp');
          url.searchParams.delete('tgWebAppStartParam');
          url.searchParams.set('creator_tg_id', String(tgId));
          window.location.href = url.toString();
        }
      } else {
        showAlert(data.error || 'Failed to create storefront.');
      }
    } catch (e: any) {
      console.error(e);
      showAlert(e.message || 'Error creating storefront.');
    }
  }, [buyerTgId, lang]);

  const isOwner = useMemo(() => {
    return !!(creator && Number(buyerTgId) === Number(creator.telegram_id));
  }, [creator, buyerTgId]);

  const showOnboarding = useMemo(() => {
    return forceShowOnboarding || (isOwner && productsList.length === 0 && !creator?.profile_customization?.onboarding_completed);
  }, [forceShowOnboarding, isOwner, productsList, creator]);

  const hasBookingConflict = useMemo(() => {
    return !!(product?.product_type === 'BOOKING' && bookingDate && bookingTime && busySlots.some((slot) => {
      const start = new Date(slot.start).getTime();
      const end = new Date(slot.end).getTime();
      const selStart = new Date(`${bookingDate}T${bookingTime}:00`).getTime();
      const selEnd = selStart + 60 * 60 * 1000;
      return selStart < end && selEnd > start;
    }));
  }, [product, bookingDate, bookingTime, busySlots]);

  return {
    // States
    productId,
    buyerTgId,
    creatorTgId,
    product,
    productsList,
    loading,
    error,
    lang,
    setLang,
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
    starredIds,
    setStarredIds,
    sectionsList,
    setSectionsList,
    sectionOrder,
    setSectionOrder,
    productSections,
    setProductSections,
    currentScreen,
    setCurrentScreen,
    forceShowOnboarding,
    setForceShowOnboarding,
    isTutorialOpen,
    setIsTutorialOpen,
    isPremiumOpen,
    setIsPremiumOpen,
    isUpgrading,
    isProductReviewsOpen,
    setIsProductReviewsOpen,
    isStarsHelpOpen,
    setIsStarsHelpOpen,
    isPremiumStarsHelpOpen,
    setIsPremiumStarsHelpOpen,
    promoCodeInput,
    setPromoCodeInput,
    promoCodeStatus,
    isApplyingPromo,
    paymentMethod,
    setPaymentMethod,
    isPaymentSheetOpen,
    setIsPaymentSheetOpen,
    checkoutMethod,
    setCheckoutMethod,
    cryptoSubMethod,
    setCryptoSubMethod,
    checkoutP2pIdx,
    setCheckoutP2pIdx,
    verifying,
    verifySuccess,
    verifyError,
    setVerifyError,
    activeOrderId,
    hasBoughtInSession,
    isProcessingPayment,
    showDeliveryForm,
    setShowDeliveryForm,
    shippingSubmitted,
    setShippingSubmitted,
    isSubmittingShipping,
    shipFullName,
    setShipFullName,
    shipPhone,
    setShipPhone,
    shipMethod,
    setShipMethod,
    shipAddress,
    setShipAddress,
    bookingDate,
    setBookingDate,
    bookingTime,
    setBookingTime,
    busySlots,
    dbBookings,
    isLoadingBusySlots,
    selectedTonIdx,
    setSelectedTonIdx,
    selectedP2pIdx,
    setSelectedP2pIdx,
    copied,
    copy,
    isDemoMode,
    isDemoPaymentSuccessOpen,
    setIsDemoPaymentSuccessOpen,

    // Memoized / Calculated values
    t,
    isStorePremium,
    tonList,
    p2pList,
    tonDetails,
    p2pDetails,
    tonAmount,
    isOwner,
    showOnboarding,
    hasBookingConflict,

    // Callbacks
    handleSelectProduct,
    handleBuyPremium,
    fetchBusySlotsForProduct,
    refreshCreatorData,
    handleActivatePremium,
    handleBuyPremiumWithStars,
    handleApplyPromoCode,
    handleCompleteOnboarding,
    handleSaveSettings,
    handleAddProduct,
    handleDeleteProduct,
    handleUpdateProduct,
    handleStarsPayment,
    handleBuyDirect,
    handleSelectPaymentMethod,
    handleClaimPayment,
    handleShippingSubmit,
    handleActivateRealStore
  };
}
