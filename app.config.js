module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Number(process.env.ANDROID_VERSION_CODE || config.android.versionCode) },
});
