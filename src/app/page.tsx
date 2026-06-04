'use client';

import { useEffect, useState, useCallback } from 'react';

interface Creator {
  id: string;
  telegram_id: number;
  username: string | null;
  payment_details?: {
    ton?: string;
    p2p?: string;
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
  creator?: Creator;
}

// ─── Sub-components ───────────────────────────────────────────────

function LoadingScreen() {
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
        Loading…
      </p>
    </div>
  );
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
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
        Storefront Unavailable
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--tg-hint)', maxWidth: '280px', lineHeight: 1.6 }}>
        {message}
      </p>
      <button className="btn-secondary" style={{ maxWidth: '200px', marginTop: '8px' }} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

function ProductListScreen({ products, onSelect }: { products: Product[]; onSelect: (id: string) => void }) {
  return (
    <div style={{
      minHeight: '100svh', padding: '24px 16px 40px',
      background: 'var(--tg-bg)',
    }} className="animate-fade-in">

      {/* Header */}
      <div style={{ marginBottom: '28px', textAlign: 'center' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'var(--tg-accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', margin: '0 auto 12px',
        }}>🛍</div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.3px' }}>
          PayBio
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--tg-hint)', marginTop: '4px' }}>
          Choose a product to view its storefront
        </p>
      </div>

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="stagger">
        {products.length === 0 ? (
          <div className="tg-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <p style={{ color: 'var(--tg-hint)', fontSize: '14px', fontWeight: 500 }}>
              No products yet
            </p>
            <p style={{ color: 'var(--tg-hint)', fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>
              Use the Telegram bot to create your first product
            </p>
          </div>
        ) : products.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="tg-card animate-fade-up"
            style={{
              width: '100%', padding: '16px',
              display: 'flex', alignItems: 'center', gap: '14px',
              textAlign: 'left', cursor: 'pointer', border: 'none',
              background: 'var(--tg-secondary-bg)',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'var(--tg-accent)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--tg-text)', marginBottom: '3px' }}>
                {p.title}
              </p>
              <p style={{
                fontSize: '12px', color: 'var(--tg-hint)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.description}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontWeight: 800, fontSize: '16px', color: 'var(--tg-text)' }}>
                ${p.price_fiat}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginTop: '2px' }}>
                {p.price_stars} ⭐
              </p>
            </div>
          </button>
        ))}
      </div>
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
  const [buyerTgId, setBuyerTgId] = useState<number>(99999999);
  const [product, setProduct] = useState<Product | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'ton' | 'p2p' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStep, setVerifyStep] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const { copied, copy } = useCopy();

  // Init Telegram SDK & URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('startapp')
      || urlParams.get('product_id')
      || urlParams.get('tgWebAppStartParam');
    if (pid) setProductId(pid);

    const testId = urlParams.get('buyer_tg_id');
    if (testId) setBuyerTgId(Number(testId));

    import('@twa-dev/sdk').then((twa) => {
      const webapp = twa.default;
      webapp.ready();
      webapp.expand();
      const startParam = webapp.initDataUnsafe?.start_param;
      if (startParam) setProductId(startParam);
      const user = webapp.initDataUnsafe?.user;
      if (user?.id) setBuyerTgId(user.id);
    }).catch(() => {});
  }, []);

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        if (productId) {
          const res = await fetch(`/api/store/list?product_id=${productId}`);
          const data = await res.json();
          if (data.success && data.product) {
            setProduct(data.product);
          } else {
            setError(data.error || 'Product not found.');
          }
        } else {
          const res = await fetch('/api/store/list');
          const data = await res.json();
          if (data.success) setProductsList(data.products || []);
          else setError(data.error || 'Failed to load products.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  // Stars payment
  const handleStarsPayment = async () => {
    if (!product) return;
    try {
      const res = await fetch('/api/checkout/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, buyer_tg_id: buyerTgId }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed to create invoice.'); return; }

      const WebApp = (await import('@twa-dev/sdk')).default;
      WebApp.openInvoice(data.invoice_link, (status) => {
        if (status === 'paid') alert('🎉 Payment successful! Your file has been sent to your Telegram chat.');
        else alert(`Payment status: ${status}`);
      });
    } catch (e: any) {
      alert('Error initiating payment.');
    }
  };

  // P2P verification
  const handleVerifyReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !file) return;

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccess(false);
    setExtractedData(null);
    setVerifyStep(1);

    let orderId = '';
    try {
      const orderRes = await fetch('/api/checkout/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, buyer_tg_id: buyerTgId }),
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

  // ─── Render logic ────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (!productId) return <ProductListScreen products={productsList} onSelect={setProductId} />;
  if (error || !product) return (
    <ErrorScreen message={error || 'This storefront no longer exists.'} onBack={() => setProductId(null)} />
  );

  const tonDetails = product.creator?.payment_details?.ton || 'No TON wallet configured';
  const p2pDetails = product.creator?.payment_details?.p2p || 'No card details configured';
  const tonAmount = (product.price_fiat / 7.0).toFixed(2);

  const STEPS = [
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
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', fontWeight: 500 }}>Storefront by</p>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tg-text)' }}>
              @{product.creator?.username || 'creator'}
            </p>
          </div>
          <span className="chip chip-blue" style={{ marginLeft: 'auto' }}>
            ✓ Verified
          </span>
        </div>

        {/* Product visual */}
        <div style={{
          background: 'var(--tg-surface)',
          borderRadius: '16px',
          padding: '24px 20px',
          textAlign: 'center',
          marginBottom: '20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle accent glow */}
          <div style={{
            position: 'absolute', top: '-40px', left: '50%',
            transform: 'translateX(-50%)',
            width: '200px', height: '120px',
            background: `rgba(var(--tg-accent-rgb), 0.12)`,
            borderRadius: '50%', filter: 'blur(40px)',
            pointerEvents: 'none',
          }} />
          <span className="chip chip-hint" style={{ marginBottom: '14px', display: 'inline-flex' }}>
            📄 Digital Product
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
        </div>

        {/* Price row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'var(--tg-surface)',
          borderRadius: '14px',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginBottom: '3px' }}>Price</p>
            <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--tg-text)', letterSpacing: '-0.5px' }}>
              ${product.price_fiat}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span className="chip chip-blue">{product.price_stars} ⭐ Stars</span>
            <span className="chip chip-hint">~{tonAmount} TON</span>
          </div>
        </div>
      </div>

      {/* ── PAYMENT SECTION ── */}
      <div style={{ flex: 1, padding: '20px 16px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Payment method selector */}
        <div>
          <p className="section-header">Choose payment method</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>

            {/* Stars */}
            <button
              className={`pay-btn ${paymentMethod === 'stars' ? 'active-stars' : ''}`}
              onClick={() => setPaymentMethod('stars')}
            >
              <div className="pay-btn-icon">⭐️</div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: paymentMethod === 'stars' ? 'var(--tg-link)' : 'var(--tg-hint)' }}>
                Stars
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
                Card
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
                <p style={{ fontWeight: 700, fontSize: '15px' }}>Telegram Stars</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>Instant, secure, native</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--tg-hint)', lineHeight: 1.6, marginBottom: '16px' }}>
              Pay using your Telegram Stars balance. Your file will be delivered automatically after confirmation.
            </p>
            <button className="btn-primary" onClick={handleStarsPayment} style={{ background: 'var(--tg-accent)' }}>
              Pay {product.price_stars} Stars →
            </button>
          </div>
        )}

        {/* ── TON PANEL ── */}
        {paymentMethod === 'ton' && (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pay-btn-icon">💎</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>TON Blockchain</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>Fast · Decentralized</p>
              </div>
            </div>

            <div className="tg-divider" />

            <div>
              <p className="section-header" style={{ marginBottom: '8px' }}>Wallet address</p>
              <div className="copy-block">
                <span className="copy-value">{tonDetails}</span>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(tonDetails)}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 14px', background: 'var(--tg-bg)', borderRadius: 'var(--radius-md)',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--tg-hint)' }}>Amount to send</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tg-text)' }}>
                {tonAmount} TON
              </span>
            </div>

            <a
              href={`ton://transfer/${tonDetails}?amount=${Math.round(Number(tonAmount) * 1e9)}`}
              className="btn-primary"
              style={{ background: 'var(--tg-green)', textDecoration: 'none' }}
            >
              Open in TON Wallet →
            </a>
          </div>
        )}

        {/* ── P2P PANEL ── */}
        {paymentMethod === 'p2p' && (
          <div className="tg-card animate-fade-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pay-btn-icon">💳</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '15px' }}>Card Transfer</p>
                <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>AI-verified · Smart scan</p>
              </div>
              <span className="chip chip-green" style={{ marginLeft: 'auto' }}>AI</span>
            </div>

            <div className="tg-divider" />

            {/* Card details */}
            <div>
              <p className="section-header" style={{ marginBottom: '8px' }}>Seller card details</p>
              <div className="copy-block">
                <span className="copy-value">{p2pDetails}</span>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={() => copy(p2pDetails)}>
                  {copied ? '✓' : 'Copy'}
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
              Transfer exactly{' '}
              <strong style={{ color: 'var(--tg-text)' }}>${product.price_fiat}</strong>
              {' '}to the card above, then upload a screenshot of your confirmation below.
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
                        Tap to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tg-hint)' }}>
                        Upload payment screenshot
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--tg-hint)', marginTop: '4px', opacity: 0.6 }}>
                        JPEG or PNG
                      </p>
                    </>
                  )}
                </label>

                <button type="submit" className="btn-primary" disabled={!file}
                  style={{ background: file ? 'var(--tg-accent)' : undefined }}
                >
                  Verify & Get File →
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
                    >Retry</button>
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
                    AI Pipeline Running
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
                      Payment Approved!
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--tg-hint)' }}>
                      File delivered to your Telegram chat
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
                    <p><span style={{ color: 'var(--tg-text)' }}>Amount:</span> ${extractedData.amount}</p>
                    <p><span style={{ color: 'var(--tg-text)' }}>Receiver:</span> {extractedData.receiver_name || '—'}</p>
                    <p><span style={{ color: 'var(--tg-text)' }}>Date:</span> {extractedData.transaction_date || '—'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No method selected — hint */}
        {!paymentMethod && (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--tg-hint)', paddingTop: '8px' }}>
            Select a payment method above to continue
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '12px 16px 24px',
        fontSize: '11px', color: 'var(--tg-hint)', opacity: 0.5,
      }}>
        ⚡ Powered by PayBio
      </div>
    </div>
  );
}
