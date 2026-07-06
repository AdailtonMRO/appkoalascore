import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bleService, BleDevice, BleConnectionState } from '../services/bleService';

interface BluetoothConnectorProps {
  player1Name: string;
  player2Name: string;
  onPointTriggered: (player: 1 | 2) => void;
  onBack: () => void;
  language: 'pt' | 'en' | 'es';
  buttonMappings: Record<string, string>;
  onUpdateMapping: (btnId: string, action: string) => void;
  isVoiceMuted: boolean;
  onToggleMute: () => void;
  physicalMappings: Record<string, string>;
  onUpdatePhysicalMapping: (input: string, action: string) => void;
}

export default function BluetoothConnector({
  player1Name,
  player2Name,
  onPointTriggered,
  onBack,
  language,
  buttonMappings,
  onUpdateMapping,
  isVoiceMuted,
  onToggleMute,
  physicalMappings,
  onUpdatePhysicalMapping,
}: BluetoothConnectorProps) {
  const [connectionState, setConnectionState] = useState<BleConnectionState>('disconnected');
  const [scannedDevices, setScannedDevices] = useState<BleDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  
  // Modal State for Mapping Selector
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);

  // Modal State for Remote Input Diagnostic Test
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<
    Array<{ id: string; type: 'key' | 'touch' | 'gesture'; detail: string; timestamp: string }>
  >([]);

  const textInputRef = useRef<TextInput | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const addDiagnosticLog = (type: 'key' | 'touch' | 'gesture', detail: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = Math.random().toString(36).substring(2, 9);
    setDiagnosticLogs((prev) => [{ id, type, detail, timestamp }, ...prev].slice(0, 50));
  };

  const clearDiagnosticLogs = () => {
    setDiagnosticLogs([]);
  };

  // Auto-focus TextInput for capturing keystrokes
  useEffect(() => {
    if (showDiagnosticModal) {
      const focusInput = () => {
        textInputRef.current?.focus();
      };
      
      focusInput();
      const interval = setInterval(focusInput, 1000);
      return () => clearInterval(interval);
    }
  }, [showDiagnosticModal]);

  // Recording State variables
  const [recordingAction, setRecordingAction] = useState<string | null>(null);
  const recordInputRef = useRef<TextInput | null>(null);
  const recordTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Keep recording text input focused when modal is active
  useEffect(() => {
    if (recordingAction) {
      const focusInput = () => {
        recordInputRef.current?.focus();
      };
      focusInput();
      const interval = setInterval(focusInput, 1000);
      return () => clearInterval(interval);
    }
  }, [recordingAction]);

  const handleRecordKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    if (recordingAction) {
      onUpdatePhysicalMapping(`key_${key}`, recordingAction);
      setRecordingAction(null);
    }
  };

  const getTriggersForAction = (action: string) => {
    const list: string[] = [];
    Object.keys(physicalMappings).forEach((input) => {
      if (physicalMappings[input] === action) {
        let label = input;
        if (input === 'gesture_up') label = language === 'pt' ? 'Deslizar p/ Cima' : language === 'es' ? 'Deslizar Arriba' : 'Swipe Up';
        else if (input === 'gesture_down') label = language === 'pt' ? 'Deslizar p/ Baixo' : language === 'es' ? 'Deslizar Abajo' : 'Swipe Down';
        else if (input === 'gesture_left') label = language === 'pt' ? 'Deslizar p/ Esquerda' : language === 'es' ? 'Deslizar Izquierda' : 'Swipe Left';
        else if (input === 'gesture_right') label = language === 'pt' ? 'Deslizar p/ Direita' : language === 'es' ? 'Deslizar Derecha' : 'Swipe Right';
        else if (input.startsWith('key_')) {
          label = `${language === 'pt' ? 'Tecla' : language === 'es' ? 'Tecla' : 'Key'} '${input.substring(4)}'`;
        }
        list.push(label);
      }
    });
    return list.length > 0 ? list.join(', ') : (language === 'pt' ? 'Nenhum' : language === 'es' ? 'Ninguno' : 'None');
  };

  const PHYSICAL_ACTIONS = [
    { id: 'addPointLeft', namePt: `Ponto da Esquerda (${player1Name})`, nameEn: `Left Side Point (${player1Name})`, nameEs: `Punto de la Izquierda (${player1Name})` },
    { id: 'addPointRight', namePt: `Ponto da Direita (${player2Name})`, nameEn: `Right Side Point (${player2Name})`, nameEs: `Punto de la Derecha (${player2Name})` },
    { id: 'undo', namePt: 'Desfazer Placar (Undo)', nameEn: 'Undo Score', nameEs: 'Deshacer Marcador' },
    { id: 'announceScore', namePt: 'Falar Placar Atual', nameEn: 'Speak Score', nameEs: 'Cantar Marcador' },
    { id: 'toggleSide', namePt: 'Inverter Lado (Quadra)', nameEn: 'Swap Ends (Court)', nameEs: 'Cambiar Lado' },
    { id: 'toggleMute', namePt: 'Silenciar / Ativar Voz', nameEn: 'Mute / Unmute Voice', nameEs: 'Silenciar / Activar Voz' },
  ];

  // Localization Dictionary
  const localization = {
    pt: {
      sectionTitle: 'DISPOSITIVO REMOTO / SMARTWATCH',
      statusLabel: 'Status da Conexão:',
      disconnected: 'Desconectar',
      scanningStatus: 'Buscando Dispositivos...',
      connecting: 'Conectando...',
      connected: 'Conectado',
      activeDevice: 'Dispositivo Ativo:',
      virtualBtn: 'Botão Virtual',
      scanBtn: 'Buscar Controle / Relógio',
      stopScanBtn: 'Parar Busca',
      disconnect: 'Desconectar',
      connect: 'Conectar',
      simTitle: 'Simulador do Controle (9 Botões)',
      simDesc: 'Clique nos botões abaixo para testar as ações configuradas no seu controle remoto Bluetooth de 9 botões.',
      simError: ' * Conecte a um dispositivo (ou simulador) para testar os botões.',
      unknown: 'Dispositivo sem Nome',
      adTitle: 'Adquirir Controle Bluetooth',
      adDesc: 'Compre no AliExpress o modelo recomendado de controle de dedo compatível com o app.',
      voiceTitle: 'Feedback por Voz',
      voiceMuted: 'Voz Silenciada (Mudo)',
      voiceActive: 'Voz Ativada',
      configTitle: 'Mapeamento do Controle',
      configDesc: 'Configure a função de cada um dos 9 botões do seu controle remoto Bluetooth.',
      selectActionTitle: 'Selecionar Ação para o Botão',
      closeBtn: 'Fechar',
      btnLabel: (id: string) => `Botão ${id}`,
      action_addPointP1: `Ponto para ${player1Name}`,
      action_addPointP2: `Ponto para ${player2Name}`,
      action_undo: 'Desfazer Ponto',
      action_reset: 'Reiniciar Partida',
      action_toggleMute: 'Silenciar / Ativar Voz',
      action_announceScore: 'Falar Placar Atual',
      action_toggleSide: 'Inverter Lado (Quadra)',
      action_none: 'Nenhuma Ação',
      diagTitle: 'Diagnóstico de Controle Físico',
      diagDesc: 'Se o seu controle remoto (ex: Beauty-R1) já está pareado nas configurações de Bluetooth do seu celular, clique abaixo para testar quais sinais cada botão envia.',
      diagBtn: 'Iniciar Teste de Botões',
      diagModalTitle: 'Teste de Entrada do Controle Físico',
      diagModalInstructions: '1. Garanta que o controle está pareado no Bluetooth do celular.\n2. Pressione qualquer botão do controle.\n3. Se o controle emular teclado, as teclas aparecerão como [TECLA].\n4. Se emular mouse, aparecerão coordenadas de [TOQUE] ou [GESTO].\n5. Dica: Se o controle alterar o volume do celular, ele está enviando comandos de volume do sistema.',
      diagLogClear: 'Limpar Histórico',
      diagLogEmpty: 'Nenhum sinal detectado ainda. Pressione os botões do controle...',
    },
    en: {
      sectionTitle: 'REMOTE DEVICE / SMARTWATCH',
      statusLabel: 'Connection Status:',
      disconnected: 'Disconnected',
      scanningStatus: 'Scanning Devices...',
      connecting: 'Connecting...',
      connected: 'Connected',
      activeDevice: 'Active Device:',
      virtualBtn: 'Virtual Button',
      scanBtn: 'Scan Control / Watch',
      stopScanBtn: 'Stop Scan',
      disconnect: 'Disconnect',
      connect: 'Connect',
      simTitle: 'Remote Control Simulator (9 Buttons)',
      simDesc: 'Click the buttons below to test the actions configured on your 9-button Bluetooth remote.',
      simError: ' * Connect to a device (or simulation) to test the buttons.',
      unknown: 'Unnamed Device',
      adTitle: 'Buy Bluetooth Button',
      adDesc: 'Get the recommended bluetooth finger remote control on AliExpress.',
      voiceTitle: 'Voice Feedback',
      voiceMuted: 'Voice Muted',
      voiceActive: 'Voice Active',
      configTitle: 'Remote Mapping',
      configDesc: 'Configure the function of each of the 9 buttons on your Bluetooth remote.',
      selectActionTitle: 'Select Action for Button',
      closeBtn: 'Close',
      btnLabel: (id: string) => `Button ${id}`,
      action_addPointP1: `Point for ${player1Name}`,
      action_addPointP2: `Point for ${player2Name}`,
      action_undo: 'Undo Point',
      action_reset: 'Reset Match',
      action_toggleMute: 'Mute / Unmute Voice',
      action_announceScore: 'Announce Score',
      action_toggleSide: 'Swap Ends (Court)',
      action_none: 'No Action',
      diagTitle: 'Physical Remote Diagnostics',
      diagDesc: 'If your remote (e.g. Beauty-R1) is already paired in your phone\'s Bluetooth settings, click below to test what signals each button sends.',
      diagBtn: 'Start Button Test',
      diagModalTitle: 'Physical Remote Input Test',
      diagModalInstructions: '1. Make sure your remote is paired in your phone\'s Bluetooth settings.\n2. Press any button on the remote.\n3. If it emulates a keyboard, keys will show up as [KEY].\n4. If it emulates a mouse, coordinates will show up as [TOUCH] or [GESTURE].\n5. Tip: If the remote changes the phone volume, it is sending system volume keys.',
      diagLogClear: 'Clear History',
      diagLogEmpty: 'No signals detected yet. Press the remote buttons...',
    },
    es: {
      sectionTitle: 'DISPOSITIVO REMOTO / SMARTWATCH',
      statusLabel: 'Estado de Conexión:',
      disconnected: 'Desconectado',
      scanningStatus: 'Buscando Dispositivos...',
      connecting: 'Conectando...',
      connected: 'Conectado',
      activeDevice: 'Dispositivo Activo:',
      virtualBtn: 'Botón Virtual',
      scanBtn: 'Buscar Control / Reloj',
      stopScanBtn: 'Parar Búsqueda',
      disconnect: 'Desconectar',
      connect: 'Conectar',
      simTitle: 'Simulador del Control (9 Botones)',
      simDesc: 'Haga clic en los botones para probar las acciones configuradas en su control remoto Bluetooth de 9 botones.',
      simError: ' * Conecte a un dispositivo (ou simulador) para testar os botões.',
      unknown: 'Dispositivo sem Nome',
      adTitle: 'Comprar Botón Bluetooth',
      adDesc: 'Compra el control remoto bluetooth de dedo recomendado en AliExpress.',
      voiceTitle: 'Feedback de Voz',
      voiceMuted: 'Voz Silenciada (Mudo)',
      voiceActive: 'Voz Activada',
      configTitle: 'Mapeo del Control',
      configDesc: 'Configure la función de cada uno de los 9 botones de su control remoto Bluetooth.',
      selectActionTitle: 'Seleccionar Acción para el Botón',
      closeBtn: 'Cerrar',
      btnLabel: (id: string) => `Botón ${id}`,
      action_addPointP1: `Punto para ${player1Name}`,
      action_addPointP2: `Punto para ${player2Name}`,
      action_undo: 'Deshacer Punto',
      action_reset: 'Reiniciar Partido',
      action_toggleMute: 'Silenciar / Activar Voz',
      action_announceScore: 'Anunciar Marcador',
      action_toggleSide: 'Cambiar Lado (Cancha)',
      action_none: 'Ninguna Acción',
      diagTitle: 'Diagnóstico de Control Físico',
      diagDesc: 'Si tu control remoto (ej. Beauty-R1) ya está emparejado en el Bluetooth de tu celular, haz clic abajo para probar qué señales envía cada botón.',
      diagBtn: 'Iniciar Prueba de Botones',
      diagModalTitle: 'Prueba de Entrada del Control Físico',
      diagModalInstructions: '1. Asegúrate de que el control esté emparejado en el Bluetooth de tu celular.\n2. Presiona cualquier botón en el control.\n3. Si emula un teclado, las teclas se mostrarán como [TECLA].\n4. Si emula un mouse, las coordenadas se mostrarán como [TOQUE] o [GESTO].\n5. Consejo: Si el control cambia el volumen del teléfono, está enviando teclas de volumen del sistema.',
      diagLogClear: 'Limpiar Historial',
      diagLogEmpty: 'Ninguna señal detectada aún. Presiona los botones del control...',
    },
  };

  const t = localization[language] || localization.pt;

  const ACTIONS_LIST = [
    'addPointP1',
    'addPointP2',
    'undo',
    'reset',
    'toggleMute',
    'announceScore',
    'toggleSide',
    'none',
  ];

  // Subscribe to connection state changes
  useEffect(() => {
    bleService.onConnectionState((state) => {
      setConnectionState(state);
      if (state === 'disconnected') {
        setConnectedDeviceId(null);
      }
    });

    // Wire up legacy point triggers just in case
    bleService.onPointTriggered((player) => {
      onPointTriggered(player);
    });
  }, [onPointTriggered]);

  const handleScanToggle = () => {
    if (isScanning) {
      bleService.stopScan();
      setIsScanning(false);
    } else {
      setScannedDevices([]);
      setIsScanning(true);
      bleService.startScan((device) => {
        setScannedDevices((prev) => {
          if (prev.some((d) => d.id === device.id)) return prev;
          return [...prev, device];
        });
      });

      // Auto stop scan after 10s
      setTimeout(() => {
        bleService.stopScan();
        setIsScanning(false);
      }, 10000);
    }
  };

  const handleConnect = async (deviceId: string) => {
    setIsScanning(false);
    const success = await bleService.connect(deviceId);
    if (success) {
      setConnectedDeviceId(deviceId);
    }
  };

  const handleDisconnect = async () => {
    await bleService.disconnect();
    setConnectedDeviceId(null);
  };

  const handlePressAliExpress = async () => {
    const url = 'https://s.click.aliexpress.com/e/_c3jnuIsD';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn("Cannot open URL: " + url);
      }
    } catch (error) {
      console.warn("Error opening AliExpress link:", error);
    }
  };

  const renderDeviceRow = (device: BleDevice) => {
    const isConnecting = connectionState === 'connecting' && connectedDeviceId === device.id;
    return (
      <View key={device.id} style={styles.deviceRow}>
        <View style={styles.deviceInfo}>
          <Ionicons name="bluetooth" size={16} color="#ccff00" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{device.name || t.unknown}</Text>
            <Text style={styles.deviceId}>{device.id}</Text>
          </View>
        </View>
        {isConnecting ? (
          <ActivityIndicator size="small" color="#ccff00" />
        ) : (
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => handleConnect(device.id)}
            disabled={connectionState === 'connecting'}
          >
            <Text style={styles.connectBtnText}>{t.connect}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      {/* Top navigation Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ccff00" />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        <Ionicons name="bluetooth" size={18} color="#ccff00" /> {t.sectionTitle}
      </Text>

      {/* Main Connection Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>{t.statusLabel}</Text>
            <Text style={[styles.statusValue, styles[`status_${connectionState}`]]}>
              {connectionState === 'disconnected' && 'Desconectado'}
              {connectionState === 'scanning' && 'Buscando...'}
              {connectionState === 'connecting' && 'Conectando...'}
              {connectionState === 'connected' && 'Conectado'}
            </Text>
          </View>
          <View style={[styles.indicator, styles[`indicator_${connectionState}`]]} />
        </View>

        {connectionState === 'connected' && (
          <View style={styles.connectedDetail}>
            <Text style={styles.connectedText}>
              {t.activeDevice} {connectedDeviceId?.startsWith('VIRTUAL') ? t.virtualBtn : connectedDeviceId}
            </Text>
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Text style={styles.disconnectBtnText}>Desconectar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Voice Mute Toggle Card */}
      <View style={styles.statusCard}>
        <View style={styles.voiceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>{t.voiceTitle}</Text>
            <Text style={[styles.statusValue, { color: isVoiceMuted ? '#ef4444' : '#ccff00' }]}>
              {isVoiceMuted ? t.voiceMuted : t.voiceActive}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.voiceToggleBtn, { backgroundColor: isVoiceMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(204, 255, 0, 0.1)' }]} 
            onPress={onToggleMute}
          >
            <Ionicons 
              name={isVoiceMuted ? "volume-mute" : "volume-high"} 
              size={22} 
              color={isVoiceMuted ? "#ef4444" : "#ccff00"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Device Scan / List Section */}
      {connectionState !== 'connected' && (
        <View style={styles.scanSection}>
          <TouchableOpacity
            style={[styles.scanBtn, isScanning && styles.scanBtnActive]}
            onPress={handleScanToggle}
          >
            <Ionicons name={isScanning ? 'stop' : 'search'} size={18} color="#0f172a" />
            <Text style={styles.scanBtnText}>
              {isScanning ? t.stopScanBtn : t.scanBtn}
            </Text>
          </TouchableOpacity>

          {isScanning && scannedDevices.length === 0 && (
            <ActivityIndicator style={{ marginTop: 15 }} size="small" color="#ccff00" />
          )}

          {scannedDevices.length > 0 && (
            <View style={styles.deviceList}>
              {scannedDevices.map(renderDeviceRow)}
            </View>
          )}
        </View>
      )}

      {/* AliExpress Remote Ad Banner */}
      <TouchableOpacity style={styles.adBanner} onPress={handlePressAliExpress}>
        <View style={styles.adIconWrapper}>
          <Ionicons name="cart" size={20} color="#f97316" />
        </View>
        <View style={styles.adTextCol}>
          <Text style={styles.adTitle}>{t.adTitle}</Text>
          <Text style={styles.adDesc}>{t.adDesc}</Text>
        </View>
        <Ionicons name="open-outline" size={16} color="#f97316" />
      </TouchableOpacity>

      {/* Button Configuration Panel */}
      <View style={styles.configCard}>
        <View style={styles.configHeader}>
          <Ionicons name="cog-outline" size={20} color="#ccff00" />
          <Text style={styles.configTitle}>{t.configTitle}</Text>
        </View>
        <Text style={styles.configDesc}>{t.configDesc}</Text>

        <View style={styles.configList}>
          {Array.from({ length: 9 }).map((_, i) => {
            const btnId = String(i + 1);
            const mappedAction = buttonMappings[btnId] || 'none';
            const actionLabel = (t as any)[`action_${mappedAction}`] || mappedAction;

            return (
              <TouchableOpacity
                key={btnId}
                style={styles.configRow}
                onPress={() => setEditingBtnId(btnId)}
              >
                <View style={styles.btnBadge}>
                  <Text style={styles.btnBadgeText}>{btnId}</Text>
                </View>
                <Text style={styles.btnActionText}>{actionLabel}</Text>
                <Ionicons name="pencil" size={14} color="#64748b" />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Simulated smartwatch / BLE Buttons Panel */}
      <View style={styles.simCard}>
        <View style={styles.simHeader}>
          <Ionicons name="phone-portrait-outline" size={20} color="#ccff00" />
          <Text style={styles.simTitle}>{t.simTitle}</Text>
        </View>
        <Text style={styles.simDesc}>
          {t.simDesc}
          {connectionState !== 'connected' && (
            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>
              {t.simError}
            </Text>
          )}
        </Text>

        <View style={styles.simGrid}>
          {Array.from({ length: 9 }).map((_, i) => {
            const btnId = String(i + 1);
            const mappedAction = buttonMappings[btnId] || 'none';
            const isP1 = mappedAction === 'addPointP1';
            const isP2 = mappedAction === 'addPointP2';
            
            return (
              <TouchableOpacity
                key={btnId}
                style={[
                  styles.simGridBtn,
                  isP1 && styles.simBtnP1,
                  isP2 && styles.simBtnP2,
                  connectionState !== 'connected' && styles.disabledBtn,
                ]}
                onPress={() => bleService.simulateButtonPress(btnId)}
                disabled={connectionState !== 'connected'}
              >
                <Text style={styles.simGridBtnText}>{btnId}</Text>
                <Text style={styles.simGridBtnLabel} numberOfLines={1}>
                  {mappedAction === 'addPointP1' && 'P1'}
                  {mappedAction === 'addPointP2' && 'P2'}
                  {mappedAction === 'undo' && 'Voltar'}
                  {mappedAction === 'reset' && 'Reset'}
                  {mappedAction === 'toggleMute' && 'Muto'}
                  {mappedAction === 'announceScore' && 'Falar'}
                  {mappedAction === 'toggleSide' && 'Lado'}
                  {mappedAction === 'none' && '-'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Physical Remote Mapping Panel */}
      <View style={styles.configCard}>
        <View style={styles.configHeader}>
          <Ionicons name="game-controller-outline" size={20} color="#ccff00" />
          <Text style={styles.configTitle}>
            {language === 'pt' ? 'Mapeamento do Controle Físico' : language === 'es' ? 'Mapeo del Control Físico' : 'Physical Remote Mapping'}
          </Text>
        </View>
        <Text style={styles.configDesc}>
          {language === 'pt' ? 'Associe cada botão do seu controle físico a uma ação. Clique em "Gravar" e depois aperte o botão no controle.' : 
           language === 'es' ? 'Asocie cada botón de su control físico a una acción. Haga clic en "Gravar" y presione el botón en el control.' : 
           'Map actions to your physical remote. Click "Record" and press the button on your remote.'}
        </Text>

        <View style={styles.configList}>
          {PHYSICAL_ACTIONS.map((act) => {
            const label = language === 'pt' ? act.namePt : language === 'es' ? act.nameEs : act.nameEn;
            const currentTrigger = getTriggersForAction(act.id);
            return (
              <TouchableOpacity
                key={act.id}
                style={styles.configRow}
                onPress={() => setRecordingAction(act.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.btnActionText}>{label}</Text>
                  <Text style={{ fontSize: 11, color: '#ccff00', marginTop: 2, fontWeight: '700' }}>
                    {language === 'pt' ? 'Gatilho: ' : language === 'es' ? 'Gatillo: ' : 'Trigger: '}
                    {currentTrigger}
                  </Text>
                </View>
                <Ionicons name="recording-outline" size={16} color="#ccff00" />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Physical Remote Diagnostics Panel */}
      <View style={styles.diagCard}>
        <View style={styles.diagHeader}>
          <Ionicons name="construct-outline" size={20} color="#ccff00" />
          <Text style={styles.diagTitle}>{t.diagTitle}</Text>
        </View>
        <Text style={styles.diagDesc}>{t.diagDesc}</Text>
        <TouchableOpacity style={styles.diagBtn} onPress={() => setShowDiagnosticModal(true)}>
          <Ionicons name="play" size={16} color="#0f172a" />
          <Text style={styles.diagBtnText}>{t.diagBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Action Selector Modal */}
      <Modal
        visible={editingBtnId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingBtnId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t.selectActionTitle} {editingBtnId}
            </Text>

            <ScrollView style={styles.actionsListScroll}>
              {ACTIONS_LIST.map((action) => {
                const actionLabel = (t as any)[`action_${action}`] || action;
                const isSelected = editingBtnId ? buttonMappings[editingBtnId] === action : false;

                return (
                  <TouchableOpacity
                    key={action}
                    style={[styles.actionOption, isSelected && styles.actionOptionSelected]}
                    onPress={() => {
                      if (editingBtnId) {
                        onUpdateMapping(editingBtnId, action);
                      }
                      setEditingBtnId(null);
                    }}
                  >
                    <Text style={[styles.actionOptionText, isSelected && styles.actionOptionTextSelected]}>
                      {actionLabel}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#ccff00" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setEditingBtnId(null)}>
              <Text style={styles.modalCloseBtnText}>{t.closeBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Remote Diagnostics Modal */}
      <Modal
        visible={showDiagnosticModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDiagnosticModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: '95%' }]}>
            <Text style={styles.modalTitle}>{t.diagModalTitle}</Text>
            
            <Text style={styles.diagModalInstructions}>{t.diagModalInstructions}</Text>

            {/* Invisible TextInput to capture keystrokes */}
            <TextInput
              ref={textInputRef}
              style={styles.invisibleInput}
              showSoftInputOnFocus={false}
              autoComplete="off"
              autoCorrect={false}
              value=""
              onChangeText={(text) => {
                if (text) {
                  addDiagnosticLog('key', `Texto: "${text}"`);
                  textInputRef.current?.clear();
                }
              }}
              onKeyPress={(e) => {
                const key = e.nativeEvent.key;
                addDiagnosticLog('key', `Tecla: "${key}"`);
              }}
            />

            {/* Interactive touch/gesture testing pad */}
            <View
              style={styles.testPad}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const { pageX, pageY } = e.nativeEvent;
                touchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
              }}
              onResponderRelease={(e) => {
                const { locationX, locationY, pageX, pageY } = e.nativeEvent;
                const start = touchStartRef.current;
                if (start) {
                  const dx = pageX - start.x;
                  const dy = pageY - start.y;
                  const dt = Date.now() - start.time;
                  const dist = Math.sqrt(dx * dx + dy * dy);

                  if (dist > 35) {
                    let direction = '';
                    if (Math.abs(dx) > Math.abs(dy)) {
                      direction = dx > 0 ? (language === 'pt' ? 'Direita' : language === 'es' ? 'Derecha' : 'Right') : (language === 'pt' ? 'Esquerda' : language === 'es' ? 'Izquierda' : 'Left');
                    } else {
                      direction = dy > 0 ? (language === 'pt' ? 'Baixo' : language === 'es' ? 'Abajo' : 'Down') : (language === 'pt' ? 'Cima' : language === 'es' ? 'Arriba' : 'Up');
                    }
                    addDiagnosticLog('gesture', `Deslizar para ${direction} (dist: ${Math.round(dist)}px, ${dt}ms)`);
                  } else {
                    addDiagnosticLog('touch', `Toque em X: ${Math.round(locationX)}, Y: ${Math.round(locationY)}`);
                  }
                }
              }}
            >
              <Ionicons name="finger-print-outline" size={40} color="rgba(204, 255, 0, 0.4)" />
              <Text style={styles.testPadText}>
                {language === 'pt' ? 'ÁREA DE TESTE DE TOQUE / GESTO\n(Pressione botões aqui ou arraste)' : 
                 language === 'es' ? 'ÁREA DE PRUEBA DE TOQUE / GESTO\n(Presiona botones aquí o arrastra)' : 
                 'TOUCH / GESTURE TEST PAD\n(Press remote buttons here or drag)'}
              </Text>
            </View>

            {/* List of logs */}
            <Text style={styles.logListHeader}>
              {language === 'pt' ? 'Sinais Recebidos (Últimos 50):' : 
               language === 'es' ? 'Señales Recibidas (Últimas 50):' : 
               'Received Signals (Last 50):'}
            </Text>
            
            <ScrollView style={styles.logsScroll} contentContainerStyle={diagnosticLogs.length === 0 && { flexGrow: 1, justifyContent: 'center' }}>
              {diagnosticLogs.length === 0 ? (
                <Text style={styles.emptyLogText}>{t.diagLogEmpty}</Text>
              ) : (
                diagnosticLogs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <Text style={styles.logTime}>{log.timestamp}</Text>
                    <View style={[styles.logTypeBadge, styles[`badge_${log.type}`]]}>
                      <Text style={styles.logTypeText}>{log.type.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.logDetail}>{log.detail}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalActionBtn, styles.clearBtn]} onPress={clearDiagnosticLogs}>
                <Text style={styles.clearBtnText}>{t.diagLogClear}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, styles.closeBtnModal]} onPress={() => setShowDiagnosticModal(false)}>
                <Text style={styles.closeBtnTextModal}>{t.closeBtn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Recording Trigger Modal */}
      <Modal
        visible={recordingAction !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRecordingAction(null)}
      >
        <View 
          style={styles.modalOverlay}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponderCapture={(e) => {
            const start = recordTouchStartRef.current;
            if (start) {
              const { pageX, pageY } = e.nativeEvent;
              const dx = pageX - start.x;
              const dy = pageY - start.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 20) return true; // capture swipe gesture anywhere
            }
            return false;
          }}
          onResponderGrant={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            recordTouchStartRef.current = { x: pageX, y: pageY, time: Date.now() };
          }}
          onResponderRelease={(e) => {
            const { pageX, pageY } = e.nativeEvent;
            const start = recordTouchStartRef.current;
            if (start && recordingAction) {
              const dx = pageX - start.x;
              const dy = pageY - start.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist > 35) {
                let inputKey = '';
                if (Math.abs(dx) > Math.abs(dy)) {
                  inputKey = dx < 0 ? 'gesture_left' : 'gesture_right';
                } else {
                  inputKey = dy < 0 ? 'gesture_up' : 'gesture_down';
                }
                onUpdatePhysicalMapping(inputKey, recordingAction);
                setRecordingAction(null);
              }
            }
          }}
        >
          <View style={[styles.modalContent, { padding: 20, maxHeight: '85%' }]} onStartShouldSetResponder={() => false}>
            <Ionicons name="recording-outline" size={40} color="#ef4444" style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.modalTitle}>
              {language === 'pt' ? 'Gravando Gatilho' : language === 'es' ? 'Grabando Gatillo' : 'Recording Trigger'}
            </Text>
            
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', lineHeight: 16, marginBottom: 15 }}>
              {language === 'pt' ? 'Aperte o botão no controle agora, ou faça o gesto em qualquer parte da tela.\n(Nota: Evite botões de volume/home controlados pelo sistema Android).' : 
               language === 'es' ? 'Presiona el botón en el control ahora, o haz el gesto en cualquier parte de la pantalla.\n(Nota: Evita botones de volumen/home controlados por el sistema Android).' : 
               'Press the button on your remote now, or perform the swipe gesture anywhere on the screen.\n(Note: Avoid system volume/home buttons controlled by Android).'}
            </Text>

            {/* Invisible input to capture keystroke */}
            <TextInput
              ref={recordInputRef}
              style={styles.invisibleInput}
              showSoftInputOnFocus={false}
              autoComplete="off"
              autoCorrect={false}
              value=""
              onKeyPress={handleRecordKeyPress}
            />

            {/* Visual indicator of listening */}
            <View style={[styles.testPad, { height: 75, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.02)', marginBottom: 15 }]}>
              <ActivityIndicator size="small" color="#ef4444" style={{ marginBottom: 6 }} />
              <Text style={[styles.testPadText, { color: '#ef4444', fontSize: 9 }]}>
                {language === 'pt' ? 'AGUARDANDO SINAL DO CONTROLE...' : 
                 language === 'es' ? 'ESPERANDO SEÑAL DEL CONTROL...' : 
                 'WAITING FOR REMOTE SIGNAL...'}
              </Text>
            </View>

            {/* Manual fallback list */}
            <Text style={{ color: '#ccff00', fontSize: 11, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {language === 'pt' ? 'Ou escolha o gatilho manualmente:' : 
               language === 'es' ? 'O elige el gatillo manualmente:' : 
               'Or select trigger manually:'}
            </Text>

            <ScrollView style={{ maxHeight: 200, marginBottom: 15 }} showsVerticalScrollIndicator={true}>
              <View style={{ gap: 8 }}>
                {/* Gestures Header */}
                <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '800', marginTop: 4 }}>GESTOS (SWIPES):</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('gesture_up', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⬆️ {language === 'pt' ? 'Deslizar p/ Cima' : language === 'es' ? 'Deslizar Arriba' : 'Swipe Up'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('gesture_down', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⬇️ {language === 'pt' ? 'Deslizar p/ Baixo' : language === 'es' ? 'Deslizar Abajo' : 'Swipe Down'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('gesture_left', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⬅️ {language === 'pt' ? 'Deslizar p/ Esquerda' : language === 'es' ? 'Deslizar Izquierda' : 'Swipe Left'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('gesture_right', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>➡️ {language === 'pt' ? 'Deslizar p/ Direita' : language === 'es' ? 'Deslizar Derecha' : 'Swipe Right'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Keyboard keys Header */}
                <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '800', marginTop: 4 }}>TECLAS DE TECLADO:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_Tab', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Tecla 'Tab'</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_ ', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Tecla 'Espaço'</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_Enter', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Tecla 'Enter'</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_ArrowUp', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Seta p/ Cima</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_ArrowDown', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Seta p/ Baixo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_ArrowLeft', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Seta p/ Esquerda</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualTriggerBtn} onPress={() => { onUpdatePhysicalMapping('key_ArrowRight', recordingAction!); setRecordingAction(null); }}>
                    <Text style={styles.manualTriggerBtnText}>⌨️ Seta p/ Direita</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setRecordingAction(null)}>
              <Text style={styles.modalCloseBtnText}>{t.closeBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#090d16',
    flex: 1,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  backButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ccff00',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  status_disconnected: { color: '#ef4444' },
  status_scanning: { color: '#eab308' },
  status_connecting: { color: '#06b6d4' },
  status_connected: { color: '#10b981' },
  indicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  indicator_disconnected: { backgroundColor: '#ef4444' },
  indicator_scanning: { backgroundColor: '#eab308' },
  indicator_connecting: { backgroundColor: '#06b6d4' },
  indicator_connected: { backgroundColor: '#10b981' },
  connectedDetail: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  connectedText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    flex: 1,
  },
  scanSection: {
    marginBottom: 16,
  },
  scanBtn: {
    backgroundColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  scanBtnActive: {
    backgroundColor: '#f1f5f9',
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  deviceList: {
    marginTop: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  deviceId: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  connectBtn: {
    backgroundColor: '#ccff00',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  disconnectBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  configCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  configDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
    marginBottom: 12,
  },
  configList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  btnBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccff00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  btnBadgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
  },
  btnActionText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  simCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  simTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  simDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginBottom: 12,
  },
  simGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  simGridBtn: {
    width: '30%',
    aspectRatio: 1.1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  simBtnP1: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  simBtnP2: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  simGridBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ccff00',
  },
  simGridBtnLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  disabledBtn: {
    opacity: 0.25,
  },
  adBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    marginBottom: 16,
  },
  adIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adTextCol: {
    flex: 1,
    marginRight: 8,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f97316',
  },
  adDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionsListScroll: {
    marginBottom: 16,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionOptionSelected: {
    backgroundColor: 'rgba(204, 255, 0, 0.05)',
  },
  actionOptionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  actionOptionTextSelected: {
    color: '#ccff00',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  invisibleInput: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0,
  },
  diagCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
  },
  diagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  diagTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  diagDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 14,
    marginBottom: 12,
  },
  diagBtn: {
    backgroundColor: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  diagBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  diagModalInstructions: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  testPad: {
    height: 120,
    backgroundColor: 'rgba(204, 255, 0, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(204, 255, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 10,
  },
  testPadText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  logListHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ccff00',
    marginBottom: 8,
  },
  logsScroll: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    height: 180,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  emptyLogText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  logTime: {
    color: '#64748b',
    fontSize: 10,
    marginRight: 8,
  },
  logTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badge_key: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
  },
  badge_touch: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badge_gesture: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  logTypeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#f8fafc',
  },
  logDetail: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  closeBtnModal: {
    backgroundColor: '#ccff00',
  },
  closeBtnTextModal: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  manualTriggerBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: '47%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  manualTriggerBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
