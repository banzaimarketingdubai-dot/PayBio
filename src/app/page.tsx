'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import LoadingScreen from '@/components/LoadingScreen';
import ErrorScreen from '@/components/ErrorScreen';
import { useStorefront } from '@/hooks/useStorefront';
import { handleOpenLink } from '@/utils/telegram';

// Lazy-loaded screen components (ssr: false, prevents Telegram WebApp crash on server side)
const ProductListScreen = dynamic(() => import('@/components/screens/ProductListScreen'), {
  ssr: false,
  loading: () => <LoadingScreen lang="en" />
});

const ProductDetailView = dynamic(() => import('@/components/screens/ProductDetailView'), {
  ssr: false,
  loading: () => <LoadingScreen lang="en" />
});

const InactiveStoreView = dynamic(() => import('@/components/screens/InactiveStoreView'), {
  ssr: false
});

const PaymentSheet = dynamic(() => import('@/components/screens/PaymentSheet'), {
  ssr: false
});

const DeliveryFormView = dynamic(() => import('@/components/screens/DeliveryFormView'), {
  ssr: false,
  loading: () => <LoadingScreen lang="en" />
});

const PremiumFlow = dynamic(() => import('@/components/PremiumFlow'), {
  ssr: false
});

const OnboardingScreen = dynamic(() => import('@/components/OnboardingScreen'), {
  ssr: false
});

const InteractiveTutorial = dynamic(() => import('@/components/InteractiveTutorial'), {
  ssr: false
});

export default function Storefront() {
  const store = useStorefront();

  if (store.loading) {
    return <LoadingScreen lang={store.lang} />;
  }

  if (store.showOnboarding) {
    return <OnboardingScreen lang={store.lang} onComplete={store.handleCompleteOnboarding} />;
  }

  // ─── OVERLAYS RENDERER ───
  const renderOverlays = () => {
    return (
      <>
        {store.product && (
          <PaymentSheet
            isOpen={store.isPaymentSheetOpen}
            onClose={() => store.setIsPaymentSheetOpen(false)}
            lang={store.lang}
            t={store.t}
            product={store.product}
            bookingDate={store.bookingDate}
            bookingTime={store.bookingTime}
            tonAmount={store.tonAmount}
            checkoutMethod={store.checkoutMethod}
            setCheckoutMethod={store.setCheckoutMethod}
            p2pList={store.p2pList}
            checkoutP2pIdx={store.checkoutP2pIdx}
            setCheckoutP2pIdx={store.setCheckoutP2pIdx}
            copied={store.copied}
            copy={store.copy}
            cryptoSubMethod={store.cryptoSubMethod}
            setCryptoSubMethod={store.setCryptoSubMethod}
            tonDetails={store.tonDetails}
            handleSelectPaymentMethod={store.handleSelectPaymentMethod}
            handleStarsPayment={store.handleStarsPayment}
            handleBuyDirect={store.handleBuyDirect}
            hasBookingConflict={store.hasBookingConflict}
            verifying={store.verifying}
            verifySuccess={store.verifySuccess}
            verifyError={store.verifyError}
            setVerifyError={store.setVerifyError}
            isProcessingPayment={store.isProcessingPayment}
            handleClaimPayment={store.handleClaimPayment}
          />
        )}

        <PremiumFlow
          isOpen={store.isPremiumOpen}
          onClose={() => store.setIsPremiumOpen(false)}
          lang={store.lang}
          t={store.t}
          isUpgrading={store.isUpgrading}
          onBuyPremiumWithStars={store.handleBuyPremiumWithStars}
          isPremiumStarsHelpOpen={store.isPremiumStarsHelpOpen}
          onTogglePremiumStarsHelp={() => store.setIsPremiumStarsHelpOpen(!store.isPremiumStarsHelpOpen)}
          onOpenLink={handleOpenLink}
          promoCodeInput={store.promoCodeInput}
          onPromoCodeInputChange={store.setPromoCodeInput}
          onApplyPromoCode={store.handleApplyPromoCode}
          promoCodeStatus={store.promoCodeStatus}
          isApplyingPromo={store.isApplyingPromo}
          onBuyPremium={store.handleBuyPremium}
        />

        {/* Demo Mode Payment Success Custom Overlay */}
        {store.isDemoPaymentSuccessOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }} className="animate-fade-in">
            <div style={{
              background: 'var(--tg-bg)',
              color: 'var(--tg-text)',
              borderRadius: '24px',
              padding: '32px 24px',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)'
            }} className="animate-scale-in">
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF9500, #FFCC00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                margin: '0 auto 24px auto',
                boxShadow: '0 8px 16px rgba(255,149,0,0.3)'
              }}>
                ⭐
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>
                {store.lang === 'ru' ? 'Тестовая покупка успешна!' : 'Test Payment Successful!'}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--tg-hint)', lineHeight: 1.5, marginBottom: '28px' }}>
                {store.lang === 'ru'
                  ? 'Вы симулировали оплату через Telegram Stars. В реальном магазине клиент мгновенно получает доступ к цифровому товару, билету или слоту записи.'
                  : 'You simulated a Telegram Stars purchase. In a real store, the client instantly gets access to their digital file, ticket, or calendar booking.'}
              </p>
              <button
                className="btn-primary"
                onClick={async () => {
                  store.setIsDemoPaymentSuccessOpen(false);
                  store.handleSelectProduct(null);
                  await store.handleActivateRealStore();
                }}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #0088CC, #00A6FF)',
                  border: 'none',
                  color: '#fff',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,136,204,0.3)'
                }}
              >
                {store.lang === 'ru' ? 'Создать свой магазин ✨' : 'Create My Store ✨'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  // If store subscription expired and user is a buyer
  if (!store.isStorePremium && !store.isOwner) {
    return (
      <>
        <InactiveStoreView lang={store.lang} />
        {renderOverlays()}
      </>
    );
  }

  // If a delivery coordinates form needs to be filled out
  if (store.showDeliveryForm && store.product) {
    return (
      <>
        <DeliveryFormView
          lang={store.lang}
          product={store.product}
          shipFullName={store.shipFullName}
          setShipFullName={store.setShipFullName}
          shipPhone={store.shipPhone}
          setShipPhone={store.setShipPhone}
          shipMethod={store.shipMethod}
          setShipMethod={store.setShipMethod}
          shipAddress={store.shipAddress}
          setShipAddress={store.setShipAddress}
          isSubmittingShipping={store.isSubmittingShipping}
          onSubmit={store.handleShippingSubmit}
        />
        {renderOverlays()}
      </>
    );
  }

  // Delivery completed confirmation screen
  if (store.shippingSubmitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--tg-bg)',
        color: 'var(--tg-text)',
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }} className="animate-scale-in">
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(77,202,90,0.1)', border: '2px solid var(--tg-green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px', marginBottom: '24px', color: 'var(--tg-green)'
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 12px 0' }}>
          {store.lang === 'ru' ? 'Доставка оформлена!' : 'Delivery Scheduled!'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--tg-hint)', marginBottom: '32px', lineHeight: 1.5, maxWidth: '300px' }}>
          {store.lang === 'ru' 
            ? 'Данные доставки успешно отправлены продавцу. Вы получите уведомление с трек-номером после отправки.'
            : 'Your delivery coordinates have been sent. You will be notified with a tracking number once shipped.'}
        </p>
        <button
          className="btn-primary"
          onClick={async () => {
            store.setShippingSubmitted(false);
            store.handleSelectProduct(null);
            if (store.isDemoMode) {
              await store.handleActivateRealStore();
            }
          }}
          style={{ width: '100%', maxWidth: '240px' }}
        >
          {store.lang === 'ru' ? (store.isDemoMode ? 'Создать свой магазин ✨' : 'Вернуться в магазин') : (store.isDemoMode ? 'Create My Store ✨' : 'Back to Shop')}
        </button>
      </div>
    );
  }

  // Product detail view page details
  // Normal storefront main catalog lists screen page
  if (!store.productId && store.error) {
    return (
      <ErrorScreen message={store.error} onBack={() => store.handleSelectProduct(null)} lang={store.lang} />
    );
  }

  return (
    <>
      {/* Главный каталог: постоянно смонтирован в DOM для сохранения состояния скролла */}
      <div style={{ display: !store.productId ? 'block' : 'none' }}>
        <ProductListScreen
          products={store.productsList}
          onSelect={store.handleSelectProduct}
          creator={store.creator}
          setCreator={store.setCreator}
          storeName={store.storeName}
          setStoreName={store.setStoreName}
          storeDescription={store.storeDescription}
          setStoreDescription={store.setStoreDescription}
          storeAvatar={store.storeAvatar}
          setStoreAvatar={store.setStoreAvatar}
          storeBanner={store.storeBanner}
          setStoreBanner={store.setStoreBanner}
          socialLinks={store.socialLinks}
          setSocialLinks={store.setSocialLinks}
          onAddProduct={store.handleAddProduct}
          onOpenPremium={() => store.setIsPremiumOpen(true)}
          lang={store.lang}
          setLang={store.setLang}
          isOwner={store.isOwner}
          onDeleteProduct={store.handleDeleteProduct}
          onUpdateProduct={store.handleUpdateProduct}
          currentScreen={store.currentScreen}
          setCurrentScreen={store.setCurrentScreen}
          starredIds={store.starredIds}
          setStarredIds={store.setStarredIds}
          sectionsList={store.sectionsList}
          setSectionsList={store.setSectionsList}
          sectionOrder={store.sectionOrder}
          setSectionOrder={store.setSectionOrder}
          productSections={store.productSections}
          setProductSections={store.setProductSections}
          onSaveSettings={store.handleSaveSettings}
          busySlots={store.busySlots}
          dbBookings={store.dbBookings}
          fetchBusySlotsForProduct={store.fetchBusySlotsForProduct}
          buyerTgId={store.buyerTgId}
          onTriggerOnboarding={() => {
            store.setForceShowOnboarding(true);
            store.setCurrentScreen('CATALOG');
          }}
          isDemoMode={store.isDemoMode}
          onActivateRealStore={store.handleActivateRealStore}
        />
      </div>

      {/* Карточка товара: монтируется только при выборе товара */}
      {store.productId && (
        <div style={{ display: store.productId ? 'block' : 'none' }}>
          {store.error ? (
            <ErrorScreen
              message={store.error}
              onBack={() => store.handleSelectProduct(null)}
              lang={store.lang}
            />
          ) : !store.product ? (
            <LoadingScreen lang={store.lang} />
          ) : (
            <ProductDetailView
              lang={store.lang}
              product={store.product}
              t={store.t}
              isOwner={store.isOwner}
              isStorePremium={store.isStorePremium}
              tonAmount={store.tonAmount}
              bookingDate={store.bookingDate}
              setBookingDate={store.setBookingDate}
              bookingTime={store.bookingTime}
              setBookingTime={store.setBookingTime}
              busySlots={store.busySlots}
              dbBookings={store.dbBookings}
              fetchBusySlotsForProduct={store.fetchBusySlotsForProduct}
              buyerTgId={store.buyerTgId}
              isProductReviewsOpen={store.isProductReviewsOpen}
              setIsProductReviewsOpen={store.setIsProductReviewsOpen}
              handleSelectProduct={store.handleSelectProduct}
              setIsPaymentSheetOpen={store.setIsPaymentSheetOpen}
              setIsPremiumOpen={store.setIsPremiumOpen}
              hasBoughtInSession={store.hasBoughtInSession}
            />
          )}
        </div>
      )}
      {renderOverlays()}
      <InteractiveTutorial
        isOpen={store.isTutorialOpen}
        onClose={() => store.setIsTutorialOpen(false)}
        lang={store.lang}
        setCurrentScreen={store.setCurrentScreen}
      />
    </>
  );
}
