import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

interface UpgradeScreenProps {
  onClose: () => void;
  language: 'pt' | 'en' | 'es';
  onUpgradeSuccess: () => void;
}

const TEXTS = {
  pt: {
    title: 'Liberte o Poder Total',
    subtitle: 'Escolha o plano ideal para elevar seu nível no tênis',
    lifetime: 'Acesso Vitalício',
    lifetimeDesc: 'Pague uma vez, use para sempre. Sem assinaturas.',
    trial: 'Experimente Grátis',
    trialDesc: '7 dias grátis, depois R$ 49,90 pago uma única vez.',
    startTrial: 'Iniciar Teste Grátis (7 Dias)',
    buyLifetime: 'Adquirir Licença Vitalícia',
    featuresTitle: 'O que você terá no Pro:',
    featureAds: '100% Livre de Anúncios',
    featureAdsDesc: 'Foco total no jogo, sem distrações visuais.',
    featureWatch: 'Integração com Apple Watch',
    featureWatchDesc: 'Marque pontos diretamente pelo pulso.',
    featureRemote: 'Controles Remotos & Mapeamento BLE',
    featureRemoteDesc: 'Use botões Bluetooth ou botões de volume.',
    featureCloud: 'Histórico & Sincronização em Nuvem',
    featureCloudDesc: 'Salve mais de 5 partidas e sincronize seus dados.',
    featureMulti: 'Multiplayer & Ranking Completo',
    featureMultiDesc: 'Gerencie filas de treinos e tabelas de líderes.',
    purchaseSuccess: 'Parabéns! Você agora é um membro PRO!',
    purchaseError: 'Erro ao processar ativação. Tente novamente.',
    legalText: 'Termos de Uso e Política de Privacidade se aplicam.',
    back: 'Voltar',
  },
  en: {
    title: 'Unlock Full Power',
    subtitle: 'Choose the perfect plan to elevate your tennis game',
    lifetime: 'Lifetime Access',
    lifetimeDesc: 'Pay once, use forever. No subscriptions.',
    trial: 'Try for Free',
    trialDesc: '7 days free trial, then $9.99 one-time payment.',
    startTrial: 'Start 7-Day Free Trial',
    buyLifetime: 'Buy Lifetime License',
    featuresTitle: 'What you get with Pro:',
    featureAds: '100% Ad-Free',
    featureAdsDesc: 'Complete focus on the match, no distractions.',
    featureWatch: 'Apple Watch Integration',
    featureWatchDesc: 'Score points directly from your wrist.',
    featureRemote: 'Remote Controls & BLE Mapping',
    featureRemoteDesc: 'Use custom Bluetooth clickers or volume buttons.',
    featureCloud: 'Match History & Cloud Sync',
    featureCloudDesc: 'Save unlimited matches and backup your stats.',
    featureMulti: 'Multiplayer & Rankings',
    featureMultiDesc: 'Manage rotation queues and leaderboards.',
    purchaseSuccess: 'Congratulations! You are now a PRO member!',
    purchaseError: 'Activation failed. Please try again.',
    legalText: 'Terms of Service and Privacy Policy apply.',
    back: 'Back',
  },
  es: {
    title: 'Libera el Poder Total',
    subtitle: 'Elige el plan ideal para elevar tu nivel de tenis',
    lifetime: 'Acceso Vitalicio',
    lifetimeDesc: 'Paga una vez, úsalo para siempre. Sin suscripciones.',
    trial: 'Pruébalo Gratis',
    trialDesc: '7 días gratis, luego $9.99 pago único.',
    startTrial: 'Iniciar Prueba Gratis (7 Días)',
    buyLifetime: 'Adquirir Licencia Vitalicia',
    featuresTitle: 'Lo que obtienes con Pro:',
    featureAds: '100% Libre de Anuncios',
    featureAdsDesc: 'Enfoque total en el juego, sin distracciones.',
    featureWatch: 'Integración con Apple Watch',
    featureWatchDesc: 'Suma puntos directamente desde tu muñeca.',
    featureRemote: 'Controles Remotos y Mapeo BLE',
    featureRemoteDesc: 'Usa botones Bluetooth o botones de volumen.',
    featureCloud: 'Historial y Sincronización en la Nube',
    featureCloudDesc: 'Guarda partidos ilimitados y respalda tus datos.',
    featureMulti: 'Multiplayer y Clasificaciones',
    featureMultiDesc: 'Administra filas de entrenamiento y tablas de líderes.',
    purchaseSuccess: '¡Felicitaciones! ¡Ahora eres miembro PRO!',
    purchaseError: 'Error al procesar la activación. Inténtalo de nuevo.',
    legalText: 'Se aplican los Términos de Uso y Política de Privacidad.',
    back: 'Volver',
  },
};

export default function UpgradeScreen({ onClose, language, onUpgradeSuccess }: UpgradeScreenProps) {
  const [loading, setLoading] = useState(false);

  const texts = TEXTS[language] || TEXTS.pt;

  const handleActivatePro = async (type: 'trial' | 'lifetime') => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        language === 'pt' ? 'Login Necessário' : 'Login Required',
        language === 'pt' 
          ? 'Por favor, faça login ou cadastre-se primeiro para vincular sua assinatura.' 
          : 'Please log in or register first to link your membership.'
      );
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'profiles', user.uid);
      
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const generatedApiKey = 'koala_' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

      await setDoc(userRef, {
        tier: 'pro',
        api_key: generatedApiKey,
        membership_type: type,
        activated_at: new Date().toISOString(),
      }, { merge: true });

      Alert.alert(
        language === 'pt' ? 'Sucesso' : 'Success',
        texts.purchaseSuccess,
        [{ text: 'OK', onPress: () => {
          onUpgradeSuccess();
          onClose();
        }}]
      );
    } catch (error: any) {
      console.error('Error activating Pro:', error);
      Alert.alert(language === 'pt' ? 'Erro' : 'Error', texts.purchaseError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>{texts.back}</Text>
        </TouchableOpacity>
        <Ionicons name="sparkles" size={24} color="#ccff00" />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{texts.title}</Text>
        <Text style={styles.subtitle}>{texts.subtitle}</Text>

        {/* Pro features list */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>{texts.featuresTitle}</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color="#ccff00" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>{texts.featureAds}</Text>
              <Text style={styles.featureDesc}>{texts.featureAdsDesc}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color="#ccff00" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>{texts.featureWatch}</Text>
              <Text style={styles.featureDesc}>{texts.featureWatchDesc}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color="#ccff00" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>{texts.featureRemote}</Text>
              <Text style={styles.featureDesc}>{texts.featureRemoteDesc}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color="#ccff00" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>{texts.featureCloud}</Text>
              <Text style={styles.featureDesc}>{texts.featureCloudDesc}</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={22} color="#ccff00" style={styles.featureIcon} />
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureName}>{texts.featureMulti}</Text>
              <Text style={styles.featureDesc}>{texts.featureMultiDesc}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#ccff00" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.purchaseOptions}>
            {/* Trial Option */}
            <TouchableOpacity style={styles.optionCard} onPress={() => handleActivatePro('trial')}>
              <View style={styles.optionHeader}>
                <Ionicons name="time-outline" size={20} color="#ccff00" />
                <Text style={styles.optionTitle}>{texts.trial}</Text>
              </View>
              <Text style={styles.optionDesc}>{texts.trialDesc}</Text>
              <View style={[styles.actionBtn, styles.trialBtn]}>
                <Text style={styles.actionBtnText}>{texts.startTrial}</Text>
              </View>
            </TouchableOpacity>

            {/* Lifetime Option */}
            <TouchableOpacity style={[styles.optionCard, styles.lifetimeCard]} onPress={() => handleActivatePro('lifetime')}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>POPULAR</Text>
              </View>
              <View style={styles.optionHeader}>
                <Ionicons name="infinite" size={20} color="#ccff00" />
                <Text style={styles.optionTitle}>{texts.lifetime}</Text>
              </View>
              <Text style={styles.optionDesc}>{texts.lifetimeDesc}</Text>
              <View style={[styles.actionBtn, styles.lifetimeBtn]}>
                <Text style={[styles.actionBtnText, { color: '#0f172a' }]}>{texts.buyLifetime}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.legalText}>{texts.legalText}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 25,
    lineHeight: 22,
  },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 30,
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  purchaseOptions: {
    gap: 20,
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
  },
  lifetimeCard: {
    borderColor: 'rgba(204, 255, 0, 0.3)',
    backgroundColor: 'rgba(204, 255, 0, 0.02)',
  },
  badge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#ccff00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  optionDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trialBtn: {
    borderWidth: 1,
    borderColor: '#ccff00',
  },
  lifetimeBtn: {
    backgroundColor: '#ccff00',
  },
  actionBtnText: {
    color: '#ccff00',
    fontSize: 15,
    fontWeight: 'bold',
  },
  legalText: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
});
