module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@':          './src',
            '@common':    './src/common',
            '@modules':   './src/modules',
            '@navigation':'./src/navigation',
            '@config':    './src/config',
            '@store':     './src/store',
            '@assets':    './src/assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
