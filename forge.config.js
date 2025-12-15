const path = require('path');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'soundcloud-desktop',
    appBundleId: 'com.enderice2.soundcloud-desktop',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'enderice2 <enderice2@protonmail.com>',
        setupIcon: path.resolve(__dirname, 'assets', 'logo.ico'),
      },
    },
    {
      name: '@electron-forge/maker-wix',
      config: {
        language: 1033,
        manufacturer: 'enderice2',
        icon: path.resolve(__dirname, 'assets', 'logo.ico'),
        ui: {
          chooseDirectory: true,
          // images: {
          //   background: path.resolve(__dirname, "493x312.png"),
          //   banner: path.resolve(__dirname, "493x58.png")
          // },
        }
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
      config: {
        icon: path.resolve(__dirname, 'assets', 'logo.png'),
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        icon: path.resolve(__dirname, 'assets', 'logo.icns'),
      },
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'enderice2 <enderice2@protonmail.com>',
          homepage: 'https://github.com/EnderIce2/soundcloud-desktop',
          description: 'Unofficial SoundCloud Desktop Application for PC and Mac',
          priority: 'optional',
          section: 'sound',
          depends: ['libc6', 'libnotify4'],
          icon: path.resolve(__dirname, 'assets', 'logo.png'),
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {
        options: {
          productName: 'SoundCloud Desktop',
          productDescription: 'Unofficial SoundCloud Desktop Application for PC and Mac',
          license: 'BSD-3-Clause',
          requires: ['libX11', 'glibc'],
          revision: '1',
          summary: 'Unofficial SoundCloud desktop client',
          icon: path.resolve(__dirname, 'assets', 'logo.png'),
        },
      },
    },
    {
      name: '@electron-forge/maker-flatpak',
      platforms: ['linux'],
      config: {
        options: {
          id: 'com.enderice2.soundcloud-desktop',
          // runtime: 'org.freedesktop.Platform',
          // runtimeVersion: '25.08',
          sdk: 'org.freedesktop.Sdk',
          base: 'io.atom.electron.BaseApp',
          baseVersion: 'stable',
          name: 'SoundCloud Desktop',
          comment: 'Unofficial desktop app for SoundCloud',
          description: 'Unofficial SoundCloud Desktop Application for PC and Mac',
          categories: ['Audio', 'Music'],
          icon: {
            "512x512": path.resolve(__dirname, 'assets', 'logo.png'),
            // scalable: 'icon.svg',
          },
          finishArgs: [
            // Wayland/X11 Rendering
            '--socket=x11', '--socket=wayland', '--share=ipc',
            // OpenGL
            '--device=dri',
            // Audio output
            '--socket=pulseaudio',
            // Chromium uses a socket in tmp for its singleton check
            '--env=TMPDIR=/var/tmp',
            // Allow communication with network
            '--share=network',
            // System notifications with libnotify
            '--talk-name=org.freedesktop.Notifications',
            // Discord RPC
            '--filesystem=xdg-run/app/com.discordapp.Discord:create',
            '--filesystem=xdg-run/.flatpak/dev.vencord.Vesktop:create',
            '--filesystem=xdg-run/discord-ipc-0',
          ],
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
