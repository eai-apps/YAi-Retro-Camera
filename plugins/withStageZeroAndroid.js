const {withGradleProperties,withAndroidManifest,withAppBuildGradle}=require('@expo/config-plugins');
module.exports=function(config){
  config=withAppBuildGradle(config,result=>{
    const marker='// YAi: package only complete native architectures.';
    if(!result.modResults.contents.includes(marker)){
      const anchor='    defaultConfig {';
      if(!result.modResults.contents.includes(anchor))throw Error('Review Expo defaultConfig ABI filter');
      result.modResults.contents=result.modResults.contents.replace(anchor,anchor+`
        ${marker}
        ndk { abiFilters(*((findProperty('reactNativeArchitectures') ?: 'arm64-v8a,armeabi-v7a,x86_64').split(','))) }
`);
    }
    return result;
  });
  config=withAndroidManifest(config,result=>{
    const permissions=result.modResults.manifest['uses-permission']??[];
    // Keep Expo's tools:node="remove" directives: dropping those allows AARs
    // to reintroduce legacy storage permissions during Android manifest merging.
    result.modResults.manifest['uses-permission']=permissions.filter(p=>p.$['tools:node']==='remove'||!['android.permission.WRITE_EXTERNAL_STORAGE','android.permission.READ_EXTERNAL_STORAGE'].includes(p.$['android:name']));
    return result;
  });
  return withGradleProperties(config,result=>{
    for(const [key,value] of Object.entries({'android.minSdkVersion':'29','org.gradle.jvmargs':'-Xmx4g -XX:MaxMetaspaceSize=1g'})){
      result.modResults=result.modResults.filter(p=>p.type!=='property'||p.key!==key);result.modResults.push({type:'property',key,value});
    }return result;
  });
};
