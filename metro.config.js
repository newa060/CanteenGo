const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .mjs support for lucide-react-native ESM compatibility
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
