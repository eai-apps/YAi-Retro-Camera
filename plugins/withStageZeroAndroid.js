const {withGradleProperties,withAndroidManifest}=require('@expo/config-plugins');
module.exports=function(config){
  config=withAndroidManifest(config,result=>{
    const permissions=result.modResults.manifest['uses-permission']??[];
    result.modResults.manifest['uses-permission']=permissions.filter(p=>!['android.permission.WRITE_EXTERNAL_STORAGE','android.permission.READ_EXTERNAL_STORAGE'].includes(p.$['android:name']));
    result.modResults.manifest['uses-permission'].push({$:{'android:name':'android.permission.WRITE_EXTERNAL_STORAGE','android:maxSdkVersion':'28'}});
    result.modResults.manifest['uses-permission'].push({$:{'android:name':'android.permission.READ_EXTERNAL_STORAGE','android:maxSdkVersion':'28'}});
    return result;
  });
  return withGradleProperties(config,result=>{
    for(const [key,value] of Object.entries({'android.minSdkVersion':'26','org.gradle.jvmargs':'-Xmx4g -XX:MaxMetaspaceSize=1g'})){
      result.modResults=result.modResults.filter(p=>p.type!=='property'||p.key!==key);result.modResults.push({type:'property',key,value});
    }return result;
  });
};
