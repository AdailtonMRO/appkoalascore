import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

interface LoginScreenProps {
  onClose: () => void;
  onLoginSuccess: (session: any) => void;
  language: 'pt' | 'en' | 'es';
}

export default function LoginScreen({ onClose, onLoginSuccess, language }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const texts = {
    pt: {
      login: 'Entrar',
      register: 'Cadastrar',
      email: 'E-mail',
      password: 'Senha',
      back: 'Voltar',
      forgot: 'Esqueceu a senha?',
      createAccount: 'Não tem uma conta? Cadastre-se',
      haveAccount: 'Já tem uma conta? Entre',
      sendReset: 'Enviar E-mail de Recuperação',
      error: 'Erro',
      success: 'Sucesso',
      emailRequired: 'Preencha o e-mail.',
      passRequired: 'Preencha a senha.',
      resetSent: 'Instruções de recuperação enviadas para o seu e-mail.',
      registerSuccess: 'Conta criada com sucesso! Verifique seu e-mail para confirmação se necessário.',
      orEnterWith: 'Ou continue com',
      google: 'Google',
      apple: 'Apple',
    },
    en: {
      login: 'Sign In',
      register: 'Sign Up',
      email: 'Email',
      password: 'Password',
      back: 'Back',
      forgot: 'Forgot Password?',
      createAccount: "Don't have an account? Sign Up",
      haveAccount: 'Already have an account? Sign In',
      sendReset: 'Send Recovery Email',
      error: 'Error',
      success: 'Success',
      emailRequired: 'Please enter your email.',
      passRequired: 'Please enter your password.',
      resetSent: 'Recovery instructions sent to your email.',
      registerSuccess: 'Account created successfully! Check your email for verification if needed.',
      orEnterWith: 'Or continue with',
      google: 'Google',
      apple: 'Apple',
    },
    es: {
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      email: 'Correo electrónico',
      password: 'Contraseña',
      back: 'Volver',
      forgot: '¿Olvidaste tu contraseña?',
      createAccount: '¿No tienes una cuenta? Regístrate',
      haveAccount: '¿Ya tienes una conta? Inicia sesión',
      sendReset: 'Enviar Correo de Recuperación',
      error: 'Error',
      success: 'Éxito',
      emailRequired: 'Por favor ingrese su correo.',
      passRequired: 'Por favor ingrese su contraseña.',
      resetSent: 'Instrucciones de recuperación enviadas a su correo.',
      registerSuccess: '¡Cuenta creada con éxito! Revise su correo para confirmar si es necesario.',
      orEnterWith: 'O continuar con',
      google: 'Google',
      apple: 'Apple',
    },
  }[language || 'pt'];

  const handleGoogleLogin = async () => {
    console.log('Google login button clicked.');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        console.log('Running on web. Initializing GoogleAuthProvider...');
        const provider = new GoogleAuthProvider();
        console.log('Calling signInWithPopup with:', { auth, provider });
        const userCredential = await signInWithPopup(auth, provider);
        console.log('signInWithPopup resolved:', userCredential);
        if (userCredential.user) {
          onLoginSuccess({
            user: {
              id: userCredential.user.uid,
              email: userCredential.user.email,
            },
          });
        }
      } else {
        console.log('Running on mobile. Native sign-in required.');
        Alert.alert(
          texts.error,
          language === 'pt'
            ? 'Login social no celular requer configuração nativa de app store.'
            : 'Social login on mobile requires native app store configuration.'
        );
      }
    } catch (error: any) {
      console.error('Error during Google login:', error);
      Alert.alert(texts.error, error.message || 'Erro no login com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    console.log('Apple login button clicked.');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        console.log('Running on web. Initializing Apple OAuthProvider...');
        const provider = new OAuthProvider('apple.com');
        console.log('Calling signInWithPopup...');
        const userCredential = await signInWithPopup(auth, provider);
        console.log('signInWithPopup resolved:', userCredential);
        if (userCredential.user) {
          onLoginSuccess({
            user: {
              id: userCredential.user.uid,
              email: userCredential.user.email,
            },
          });
        }
      } else {
        console.log('Running on mobile. Native sign-in required.');
        Alert.alert(
          texts.error,
          language === 'pt'
            ? 'Login social no celular requer configuração nativa de app store.'
            : 'Social login on mobile requires native app store configuration.'
        );
      }
    } catch (error: any) {
      console.error('Error during Apple login:', error);
      Alert.alert(texts.error, error.message || 'Erro no login com Apple.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email) {
      Alert.alert(texts.error, texts.emailRequired);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        if (!password) {
          Alert.alert(texts.error, texts.passRequired);
          setLoading(false);
          return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        if (userCredential.user) {
          onLoginSuccess({
            user: {
              id: userCredential.user.uid,
              email: userCredential.user.email,
            },
          });
        }
      } else if (mode === 'register') {
        if (!password) {
          Alert.alert(texts.error, texts.passRequired);
          setLoading(false);
          return;
        }

        await createUserWithEmailAndPassword(auth, email, password);
        
        // Desloga o usuário recém-criado para seguir o fluxo padrão de login manual
        if (auth.currentUser) {
          await auth.signOut();
        }

        Alert.alert(texts.success, texts.registerSuccess);
        setMode('login');
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        Alert.alert(texts.success, texts.resetSent);
        setMode('login');
      }
    } catch (error: any) {
      Alert.alert(texts.error, error.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="arrow-back" size={24} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'login' ? texts.login : mode === 'register' ? texts.register : texts.forgot}
            </Text>
            <View style={{ width: 40 }} /> {/* Spacer */}
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.label}>{texts.email}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="exemplo@email.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode !== 'forgot' && (
              <>
                <Text style={styles.label}>{texts.password}</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </>
            )}

            {mode === 'login' && (
              <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotContainer}>
                <Text style={styles.forgotText}>{texts.forgot}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'login' ? texts.login : mode === 'register' ? texts.register : texts.sendReset}
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Social */}
            {mode === 'login' && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{texts.orEnterWith}</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtonsContainer}>
                  <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
                    <Ionicons name="logo-google" size={20} color="#f8fafc" style={{ marginRight: 8 }} />
                    <Text style={styles.socialButtonText}>{texts.google}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
                    <Ionicons name="logo-apple" size={20} color="#f8fafc" style={{ marginRight: 8 }} />
                    <Text style={styles.socialButtonText}>{texts.apple}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Alternar Modos */}
            <View style={styles.switchContainer}>
              {mode === 'login' ? (
                <TouchableOpacity onPress={() => setMode('register')}>
                  <Text style={styles.switchText}>{texts.createAccount}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setMode('login')}>
                  <Text style={styles.switchText}>{texts.haveAccount}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  formContainer: {
    padding: 24,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#f8fafc',
    fontSize: 16,
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#ccff00',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ccff00',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#ccff00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  switchContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 48,
    borderRadius: 12,
  },
  socialButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
});
