const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Добавляем .cjs чтобы Metro мог резолвить libphonenumber-js и другие CommonJS пакеты
config.resolver.sourceExts.push('cjs');

module.exports = config;
