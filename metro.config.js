const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Intercept module resolution requests for web to resolve mock files for mobile-only native modules
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native-google-mobile-ads') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'src/mocks/react-native-google-mobile-ads.ts'),
      };
    }
    if (moduleName === 'react-native-ble-plx') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'src/mocks/react-native-ble-plx.ts'),
      };
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
