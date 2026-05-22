const { build } = require('electron-builder');

build({
  config: {
    appId: 'com.nox.app',
    productName: 'Nox Task Manager',
    directories: { output: process.env.TEMP + '\\nox-release' },
    win: { target: [{ target: 'nsis', arch: ['x64'] }] },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      shortcutName: 'Nox Task Manager',
    },
    files: ['dist/**/*', 'electron/**/*', 'package.json'],
    extraResources: ['.env'],
  },
}).then(() => console.log('BUILD OK')).catch(e => console.error('BUILD FAILED', e));
