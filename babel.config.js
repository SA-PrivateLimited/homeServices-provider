module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        blocklist: null,
        allowlist: ['APP_NAME', 'COPYRIGHT_OWNER'],
        verbose: true,
      },
    ],
  ],
};
