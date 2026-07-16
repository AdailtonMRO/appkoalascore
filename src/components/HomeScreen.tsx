import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  BackHandler,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BleConnectionState } from '../services/bleService';
import { 
  NativeAd,
  NativeAdView, 
  NativeAsset,
  NativeAssetType,
  TestIds 
} from 'react-native-google-mobile-ads';

const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : 'ca-app-pub-9278504866264813/9550858432';

// Component to inject and render AdSense in web builds
function WebAdSense({ adClient, adSlot }: { adClient: string; adSlot: string }) {
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      // Injetar script do AdSense se já não estiver na página
      if (!document.getElementById('adsense-script')) {
        const script = document.createElement('script');
        script.id = 'adsense-script';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
      
      // Inicializar anúncio
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('Google AdSense load error:', e);
    }
  }, [adClient, adSlot]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.adSenseContainer}>
      <div
        style={{ width: '100%', height: 90, overflow: 'hidden', alignSelf: 'stretch', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        dangerouslySetInnerHTML={{
          __html: `
            <ins class="adsbygoogle"
                 style="display:block;width:100%;height:90px;"
                 data-ad-client="${adClient}"
                 data-ad-slot="${adSlot}"
                 data-ad-format="horizontal"
                 data-full-width-responsive="true"></ins>
          `
        }}
      />
    </View>
  );
}

interface HomeScreenProps {
  onNavigate: (screen: 'setup' | 'remote' | 'history' | 'multiplayer_setup' | 'help') => void;
  language: 'pt' | 'en' | 'es';
  onLanguageChange: (lang: 'pt' | 'en' | 'es') => void;
  connectionState: BleConnectionState;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  onQuickStart: () => void;
}

export default function HomeScreen({
  onNavigate,
  language,
  onLanguageChange,
  connectionState,
  isVoiceMuted,
  onToggleMute,
  onQuickStart,
}: HomeScreenProps) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adFailed, setAdFailed] = useState(false);
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  React.useEffect(() => {
    let active = true;
    let loadedAd: NativeAd | null = null;

    const loadNativeAd = async () => {
      if (Platform.OS === 'web') {
        setAdLoaded(true);
        setAdFailed(false);
        return;
      }
      try {
        console.log('Starting to load Native Ad with ID:', NATIVE_AD_UNIT_ID);
        const ad = await NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID);
        if (active) {
          loadedAd = ad;
          setNativeAd(ad);
          setAdLoaded(true);
          setAdFailed(false);
          console.log('Native Ad loaded successfully!');
        } else {
          ad.destroy();
        }
      } catch (error) {
        console.warn('Native Ad failed to load:', error);
        if (active) {
          setAdFailed(true);
          setAdLoaded(false);
        }
      }
    };

    loadNativeAd();

    return () => {
      active = false;
      if (loadedAd) {
        loadedAd.destroy();
      }
    };
  }, []);

  // Localization Dictionary for Home Screen
  const localization = {
    pt: {
      title: 'Koala Tênis Score',
      subtitle: 'Controle de Placar Inteligente',
      setupBtn: 'Configurar Partida',
      setupDesc: 'Defina jogadores, sets e regras da partida',
      quickStartBtn: 'Início Rápido',
      quickStartDesc: 'Mantém as últimas configurações válidas e inicia',
      remoteBtn: 'Controles Remotos',
      remoteDesc: 'Pareie botões Bluetooth ou smartwatch',
      langBtn: 'Idioma / Language',
      langDesc: 'Altere o idioma dos textos e da fala',
      connectionStatus: 'Status do Controle:',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      scanning: 'Buscando...',
      connecting: 'Conectando...',
      promoTitle: 'Curso Máquina Lançadora',
      promoDesc: 'Aprenda a construir sua própria lançadora de bolas de tênis!',
      adAreaLabel: 'Patrocinadores & Promoções',
      adPlaceholderText: 'Anuncie Aqui - Entre em contato',
      historyBtn: 'Histórico de Partidas',
      historyDesc: 'Veja suas partidas passadas, edite ou exclua registros',
      multiplayerBtn: 'Multiplayer - Treinos',
      multiplayerDesc: 'Revezamento de vários jogadores com fila e ranking',
      helpBtn: 'Ajuda & Como Usar',
      helpDesc: 'Como jogar, usar controles e regras do multiplayer',
      exitBtn: 'Sair do Aplicativo',
      exitDesc: 'Fechar o aplicativo Koala Score',
      exitAlertTitle: 'Sair',
      exitAlertMsg: 'Deseja realmente fechar o aplicativo?',
      exitAlertCancel: 'Cancelar',
      exitAlertConfirm: 'Sair',
      settingsBtn: 'Ajustes, Idioma e Ajuda',
      settingsDesc: 'Idioma, pareamento de controle e manual de uso',
      selectLang: 'Selecionar Idioma',
    },
    en: {
      title: 'Koala Tennis Score',
      subtitle: 'Smart Scoreboard Control',
      setupBtn: 'Configure Match',
      setupDesc: 'Define players, sets and match rules',
      quickStartBtn: 'Quick Start',
      quickStartDesc: 'Keep the last valid configurations and start',
      remoteBtn: 'Remote Controls',
      remoteDesc: 'Pair Bluetooth clickers or smartwatches',
      langBtn: 'Language / Idioma',
      langDesc: 'Change text and voice target language',
      connectionStatus: 'Remote Status:',
      connected: 'Connected',
      disconnected: 'Disconnected',
      scanning: 'Scanning...',
      connecting: 'Connecting...',
      promoTitle: 'Ball Launcher Course',
      promoDesc: 'Learn how to build your own tennis ball launcher machine!',
      adAreaLabel: 'Sponsors & Promotions',
      adPlaceholderText: 'Advertise Here - Contact us',
      historyBtn: 'Match History',
      historyDesc: 'View past matches, edit or delete records',
      multiplayerBtn: 'Multiplayer - Training',
      multiplayerDesc: 'Player rotation with queue and ranking',
      helpBtn: 'Help & How to Use',
      helpDesc: 'How to play, use controls, and multiplayer rules',
      exitBtn: 'Exit Application',
      exitDesc: 'Close the Koala Score application',
      exitAlertTitle: 'Exit',
      exitAlertMsg: 'Are you sure you want to close the application?',
      exitAlertCancel: 'Cancel',
      exitAlertConfirm: 'Exit',
      settingsBtn: 'Settings, Language & Help',
      settingsDesc: 'Language, remote pairing and user manual',
      selectLang: 'Select Language',
    },
    es: {
      title: 'Koala Tenis Score',
      subtitle: 'Control Inteligente de Marcador',
      setupBtn: 'Configurar Partido',
      setupDesc: 'Define jugadores, sets y reglas del partido',
      quickStartBtn: 'Inicio Rápido',
      quickStartDesc: 'Mantiene las últimas configuraciones válidas e inicia',
      remoteBtn: 'Controles Remotos',
      remoteDesc: 'Empareja botones Bluetooth o relojes',
      langBtn: 'Idioma / Language',
      langDesc: 'Cambia el idioma del texto y de la voz',
      connectionStatus: 'Estado de Control:',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      scanning: 'Buscando...',
      connecting: 'Conectando...',
      promoTitle: 'Curso Máquina Lanzadora',
      promoDesc: '¡Aprende a construir tu propia lanzadora de pelotas de tenis!',
      adAreaLabel: 'Patrocinadores y Promociones',
      adPlaceholderText: 'Anuncie Aquí - Contacto',
      historyBtn: 'Historial de Partidos',
      historyDesc: 'Mira tus partidos pasados, edita o elimina registros',
      multiplayerBtn: 'Multiplayer - Entrenamientos',
      multiplayerDesc: 'Rotación de jugadores con fila y ranking',
      helpBtn: 'Ayuda y Cómo Usar',
      helpDesc: 'Cómo jugar, usar controles y reglas de multiplayer',
      exitBtn: 'Salir de la Aplicación',
      exitDesc: 'Cerrar la aplicación Koala Score',
      exitAlertTitle: 'Salir',
      exitAlertMsg: '¿Realmente desea cerrar la aplicación?',
      exitAlertCancel: 'Cancelar',
      exitAlertConfirm: 'Salir',
      settingsBtn: 'Ajustes, Idioma y Ajuda',
      settingsDesc: 'Idioma, emparejamiento de control y manual de uso',
      selectLang: 'Seleccionar Idioma',
    },
  };

  const t = localization[language] || localization.pt;

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return t.connected;
      case 'scanning': return t.scanning;
      case 'connecting': return t.connecting;
      default: return t.disconnected;
    }
  };

  const handlePressBanner = async () => {
    const url = 'https://linktr.ee/adailtonmro?utm_source=linktree_profile_share&ltsid=2d59a4e4-6638-4d5f-adf4-6da9fd197a88';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn("Cannot open URL: " + url);
      }
    } catch (error) {
      console.warn("Error opening Linktree:", error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top right mute button */}
      <View style={styles.topRightControls}>
        <TouchableOpacity style={styles.muteButton} onPress={onToggleMute}>
          <Ionicons 
            name={isVoiceMuted ? "volume-mute" : "volume-high"} 
            size={22} 
            color={isVoiceMuted ? "#ef4444" : "#ccff00"} 
          />
        </TouchableOpacity>
      </View>

      {/* Brand Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/koala-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        {/* Quick Start Option */}
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => {
            if (Platform.OS === 'web') {
              try {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              } catch (e) {}
            }
            onQuickStart();
          }}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#ccff00' }]}>
            <Ionicons name="play" size={24} color="#0f172a" />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={styles.menuItemTitle}>{t.quickStartBtn}</Text>
            <Text style={styles.menuItemDesc}>{t.quickStartDesc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Configure Match Option */}
        <TouchableOpacity style={styles.menuItem} onPress={() => onNavigate('setup')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#06b6d4' }]}>
            <Ionicons name="trophy" size={24} color="#fff" />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={styles.menuItemTitle}>{t.setupBtn}</Text>
            <Text style={styles.menuItemDesc}>{t.setupDesc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Multiplayer Option */}
        <TouchableOpacity style={styles.menuItem} onPress={() => onNavigate('multiplayer_setup')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#10b981' }]}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={styles.menuItemTitle}>{t.multiplayerBtn}</Text>
            <Text style={styles.menuItemDesc}>{t.multiplayerDesc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Match History Option */}
        <TouchableOpacity style={styles.menuItem} onPress={() => onNavigate('history')}>
          <View style={[styles.iconWrapper, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="time" size={24} color="#fff" />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={styles.menuItemTitle}>{t.historyBtn}</Text>
            <Text style={styles.menuItemDesc}>{t.historyDesc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>

        {/* Settings, Language & Help Option */}
        <TouchableOpacity 
          style={[styles.menuItem, showSettingsMenu && styles.menuItemExpanded]} 
          onPress={() => setShowSettingsMenu(!showSettingsMenu)}
        >
          <View style={[styles.iconWrapper, { backgroundColor: '#a855f7' }]}>
            <Ionicons name="settings-sharp" size={24} color="#fff" />
          </View>
          <View style={styles.menuTextCol}>
            <Text style={styles.menuItemTitle}>{t.settingsBtn}</Text>
            <Text style={styles.menuItemDesc}>{t.settingsDesc}</Text>
          </View>
          <Ionicons 
            name={showSettingsMenu ? "chevron-up" : "chevron-forward"} 
            size={20} 
            color="#475569" 
          />
        </TouchableOpacity>

        {/* Expanded Settings menu */}
        {showSettingsMenu && (
          <View style={styles.settingsBlock}>
            {/* Help & Documentation Option */}
            <TouchableOpacity style={styles.settingsSubItem} onPress={() => onNavigate('help')}>
              <View style={[styles.settingsSubIcon, { backgroundColor: '#14b8a6' }]}>
                <Ionicons name="help-circle" size={18} color="#fff" />
              </View>
              <Text style={styles.settingsSubText}>{t.helpBtn}</Text>
              <Ionicons name="chevron-forward" size={16} color="#475569" />
            </TouchableOpacity>

            {/* Configure Remote Option */}
            <TouchableOpacity style={styles.settingsSubItem} onPress={() => onNavigate('remote')}>
              <View style={[styles.settingsSubIcon, { backgroundColor: '#f97316' }]}>
                <Ionicons name="bluetooth" size={18} color="#fff" />
              </View>
              <Text style={styles.settingsSubText}>{t.remoteBtn}</Text>
              <Ionicons name="chevron-forward" size={16} color="#475569" />
            </TouchableOpacity>

            <View style={styles.settingsSeparator} />

            {/* Language Selection */}
            <View style={styles.langSection}>
              <Text style={styles.langSectionTitle}>{t.selectLang}</Text>
              <View style={styles.langRow}>
                <TouchableOpacity 
                  style={[styles.langItem, language === 'pt' && styles.langItemActive]}
                  onPress={() => onLanguageChange('pt')}
                >
                  <Text style={styles.langFlag}>🇧🇷</Text>
                  <Text style={[styles.langText, language === 'pt' && styles.textNeon]}>PT</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.langItem, language === 'en' && styles.langItemActive]}
                  onPress={() => onLanguageChange('en')}
                >
                  <Text style={styles.langFlag}>🇺🇸</Text>
                  <Text style={[styles.langText, language === 'en' && styles.textNeon]}>EN</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.langItem, language === 'es' && styles.langItemActive]}
                  onPress={() => onLanguageChange('es')}
                >
                  <Text style={styles.langFlag}>🇪🇸</Text>
                  <Text style={[styles.langText, language === 'es' && styles.textNeon]}>ES</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Exit App Option */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity 
            style={[styles.menuItem, { borderColor: 'rgba(239, 68, 68, 0.2)', marginTop: 8 }]} 
            onPress={() => {
              Alert.alert(
                t.exitAlertTitle,
                t.exitAlertMsg,
                [
                  { text: t.exitAlertCancel, style: 'cancel' },
                  { text: t.exitAlertConfirm, onPress: () => BackHandler.exitApp() }
                ]
              );
            }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#ef4444' }]}>
              <Ionicons name="power" size={24} color="#fff" />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuItemTitle, { color: '#ef4444' }]}>{t.exitBtn}</Text>
              <Text style={styles.menuItemDesc}>{t.exitDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {/* Advertising / Sponsors Area */}
      <View style={styles.adAreaContainer}>
        <Text style={styles.adAreaLabel}>{t.adAreaLabel}</Text>
        
        {/* Course Promo Banner */}
        <TouchableOpacity style={styles.promoBanner} onPress={handlePressBanner}>
          <View style={styles.promoIconWrapper}>
            <Ionicons name="build" size={20} color="#ccff00" />
          </View>
          <View style={styles.promoTextCol}>
            <Text style={styles.promoTitle}>{t.promoTitle}</Text>
            <Text style={styles.promoDesc}>{t.promoDesc}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#ccff00" />
        </TouchableOpacity>

        {/* Ad Space: AdSense on Web, AdMob on Mobile */}
        {Platform.OS === 'web' ? (
          <WebAdSense adClient="ca-pub-9278504866264813" adSlot="1616262169" />
        ) : (
          <>
            {/* Space for AdMob Native Ad */}
            {(!adFailed && nativeAd) ? (
              <NativeAdView
                nativeAd={nativeAd}
                style={styles.adContainer}
              >
                <View style={styles.adContent}>
                  <View style={styles.adHeader}>
                    {nativeAd.icon && (
                      <NativeAsset assetType={NativeAssetType.ICON}>
                        <Image style={styles.adIcon} source={{ uri: nativeAd.icon.url }} />
                      </NativeAsset>
                    )}
                    <View style={styles.adTextContainer}>
                      <NativeAsset assetType={NativeAssetType.HEADLINE}>
                        <Text style={styles.adHeadline}>{nativeAd.headline}</Text>
                      </NativeAsset>
                      {nativeAd.advertiser && (
                        <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                          <Text style={styles.adAdvertiser}>{nativeAd.advertiser}</Text>
                        </NativeAsset>
                      )}
                    </View>
                    <View style={styles.adBadge}>
                      <Text style={styles.adBadgeText}>Ad</Text>
                    </View>
                  </View>
                  {nativeAd.body && (
                    <NativeAsset assetType={NativeAssetType.BODY}>
                      <Text style={styles.adTagline}>{nativeAd.body}</Text>
                    </NativeAsset>
                  )}
                  {nativeAd.callToAction && (
                    <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                      <View style={styles.adCta}>
                        <Text style={styles.adCtaText}>{nativeAd.callToAction}</Text>
                      </View>
                    </NativeAsset>
                  )}
                </View>
              </NativeAdView>
            ) : null}

            {/* Space for future ads (fallback/placeholder when AdMob is loading or failed) */}
            {(!adLoaded || adFailed) && (
              <View style={styles.adPlaceholder}>
                <Ionicons name="megaphone-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.adPlaceholderText}>{t.adPlaceholderText}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Bluetooth Connection Status Footer */}
      <View style={styles.statusFooter}>
        <View style={styles.statusFooterRow}>
          <Text style={styles.statusFooterLabel}>{t.connectionStatus}</Text>
          <View style={styles.statusValueRow}>
            <View style={[styles.statusDot, styles[`statusDot_${connectionState}`]]} />
            <Text style={[styles.statusValueText, styles[`statusText_${connectionState}`]]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#090d16',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logoImage: {
    width: 237,
    height: 118,
    marginBottom: 4,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(204, 255, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.15)',
    marginBottom: 16,
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  adSenseContainer: {
    width: '100%',
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    overflow: 'hidden',
  },
  ballLogo: {
    textShadowColor: 'rgba(204, 255, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  settingsBlock: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -16,
    gap: 12,
  },
  settingsSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsSubIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsSubText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  settingsSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  langSection: {
    gap: 8,
  },
  langSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 8,
    flex: 1,
    gap: 6,
  },
  langItemActive: {
    borderColor: '#ccff00',
    backgroundColor: 'rgba(204, 255, 0, 0.05)',
  },
  langFlag: {
    fontSize: 16,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  textNeon: {
    color: '#ccff00',
  },
  statusFooter: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  statusFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusFooterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDot_connected: { backgroundColor: '#10b981' },
  statusDot_scanning: { backgroundColor: '#eab308' },
  statusDot_connecting: { backgroundColor: '#06b6d4' },
  statusDot_disconnected: { backgroundColor: '#ef4444' },
  statusValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusText_connected: { color: '#10b981' },
  statusText_scanning: { color: '#eab308' },
  statusText_connecting: { color: '#06b6d4' },
  statusText_disconnected: { color: '#ef4444' },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
    marginBottom: 16,
  },
  promoIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promoTextCol: {
    flex: 1,
    marginRight: 8,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ccff00',
    letterSpacing: 0.2,
  },
  promoDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  topRightControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  muteButton: {
    padding: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  adAreaContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 16,
  },
  adAreaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  adPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  adPlaceholderText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  adContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  adContent: {
    flexDirection: 'column',
    gap: 8,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  adTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  adHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  adAdvertiser: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  adBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(204, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ccff00',
    alignSelf: 'flex-start',
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ccff00',
    textTransform: 'uppercase',
  },
  adTagline: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 14,
  },
  adCta: {
    backgroundColor: '#ccff00',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  adCtaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
});
