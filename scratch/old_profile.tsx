                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                👑 {lang === 'ru' ? 'Продлить Premium' : 'Extend Premium'}
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* ─── BANNER ─── */}
      <div 
        className="store-banner animate-fade-in" 
        style={storeBanner ? { backgroundImage: `url("${storeBanner}")` } : undefined}
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
                  onClick={() => setCurrentScreen('PARTNER')}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', fontSize: '13px',
                    marginRight: '4px'
                  }}
                  title={lang === 'ru' ? 'Кабинет партнера' : 'Partner Dashboard'}
                >
                  🤝
                </button>
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