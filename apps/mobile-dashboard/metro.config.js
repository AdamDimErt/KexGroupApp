const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Добавляем .cjs чтобы Metro мог резолвить libphonenumber-js и другие CommonJS пакеты
config.resolver.sourceExts.push('cjs');

// Включаем трансформацию expo-* пакетов (их main может указывать на .ts файлы)
config.transformer = config.transformer || {};
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Включаем root node_modules в watchFolders для монорепо
const workspaceRoot = path.resolve(__dirname, '../..');
config.watchFolders = [workspaceRoot];

module.exports = config;
