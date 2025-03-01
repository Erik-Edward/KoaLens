const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add CSS support
module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'css']
  },
  transformer: {
    ...config.transformer,
    babelTransformerPath: require.resolve('react-native-css-transformer')
  }
};