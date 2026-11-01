const { withGradleProperties } = require('@expo/config-plugins');
module.exports = function withStageZeroAndroid(config) {
  return withGradleProperties(config, result => {
    for (const [key,value] of Object.entries({'android.minSdkVersion':'29','org.gradle.jvmargs':'-Xmx4g -XX:MaxMetaspaceSize=1g'})) {
      result.modResults = result.modResults.filter(item => item.type !== 'property' || item.key !== key);
      result.modResults.push({type:'property',key,value});
    }
    return result;
  });
};
