import React from 'react';
import { View } from 'react-native';

// Default export: mobileAds function
const mobileAds = () => ({
  initialize: () => Promise.resolve({
    'test-adapter': 'initialized'
  })
});

export default mobileAds;

// TestIds Mock
export const TestIds = {
  NATIVE: 'ca-app-pub-3940256099942544/2247696110', // Standard Google Test ID
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
};

// NativeAssetType Mock
export enum NativeAssetType {
  ICON = 'ICON',
  HEADLINE = 'HEADLINE',
  ADVERTISER = 'ADVERTISER',
  BODY = 'BODY',
  CALL_TO_ACTION = 'CALL_TO_ACTION',
}

// NativeAd Mock class
export class NativeAd {
  static createForAdRequest = () => {
    return Promise.resolve({
      headline: 'Anúncio de Teste (Web Mock)',
      body: 'Este é um anúncio mockado para testes no navegador web.',
      advertiser: 'Koala Score Inc.',
      callToAction: 'Saiba Mais',
      icon: { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100' },
      destroy: () => {},
    });
  };
}

// React components mock
export const NativeAdView = ({ children, style }: any) => {
  return React.createElement(View, { style }, children);
};

export const NativeAsset = ({ children }: any) => {
  return React.createElement(View, {}, children);
};
