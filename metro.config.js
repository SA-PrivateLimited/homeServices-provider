const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoPackages = path.resolve(projectRoot, '../packages');
const appPackagesRoot = path.resolve(monorepoPackages, 'saPvtLtdAppPackages');
const appNodeModules = path.resolve(projectRoot, 'node_modules');

/**
 * Resolve monorepo sapvt-ltd-app-packages and force a single React instance.
 */
const config = {
  watchFolders: [appPackagesRoot, monorepoPackages],
  resolver: {
    unstable_enableSymlinks: true,
    nodeModulesPaths: [appNodeModules],
    extraNodeModules: {
      'sapvt-ltd-app-packages': appPackagesRoot,
      react: path.resolve(appNodeModules, 'react'),
      'react-native': path.resolve(appNodeModules, 'react-native'),
    },
    blockList: [
      new RegExp(
        `${appPackagesRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\].*`,
      ),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'sapvt-ltd-app-packages') {
        return {
          filePath: path.resolve(appPackagesRoot, 'src/index.ts'),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
