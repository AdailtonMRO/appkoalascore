import { DeviceEventEmitter } from 'react-native';

// A tiny 1-second silent WAV file base64 data URI
const SILENT_AUDIO_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAG';
let silentAudio: any = null;

export function initializePWAMediaSession() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    // 1. Setup silent audio to keep media session active
    if (!silentAudio) {
      silentAudio = new Audio(SILENT_AUDIO_BASE64);
      silentAudio.loop = true;
    }

    // 2. Play silent audio (requires user gesture like a tap/click on screen)
    silentAudio.play()
      .then(() => {
        console.log('PWA Silent audio playing. Media Session is now active.');
      })
      .catch((err: any) => {
        console.log('PWA Silent audio play pending user gesture:', err);
      });

    // 3. Configure Media Session API if available
    if ('mediaSession' in navigator) {
      const mediaMetadataConstructor = (window as any).MediaMetadata || (navigator as any).mediaSession.metadata?.constructor;
      if (mediaMetadataConstructor) {
        navigator.mediaSession.metadata = new mediaMetadataConstructor({
          title: 'Controle de Placar',
          artist: 'Koala Score',
          album: 'Placar de Tênis',
        });
      }

      navigator.mediaSession.setActionHandler('play', () => {
        DeviceEventEmitter.emit('BluetoothMediaKey', 'media_play');
        if (silentAudio) silentAudio.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        DeviceEventEmitter.emit('BluetoothMediaKey', 'media_pause');
        // Resume silent play immediately to maintain media focus and keep listening for buttons
        if (silentAudio) silentAudio.play().catch(() => {});
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        DeviceEventEmitter.emit('BluetoothMediaKey', 'media_next');
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        DeviceEventEmitter.emit('BluetoothMediaKey', 'media_previous');
      });

      navigator.mediaSession.setActionHandler('toggleplaypause' as any, () => {
        DeviceEventEmitter.emit('BluetoothMediaKey', 'media_togglePlayPause');
        if (silentAudio) {
          silentAudio.play().catch(() => {});
        }
      });
    }
  } catch (e) {
    console.warn('Failed to initialize PWA media session:', e);
  }
}

export function cleanupPWAMediaSession() {
  if (typeof window === 'undefined') return;

  try {
    if (silentAudio) {
      silentAudio.pause();
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('toggleplaypause' as any, null);
    }
  } catch (e) {
    console.warn('Failed to cleanup PWA media session:', e);
  }
}
