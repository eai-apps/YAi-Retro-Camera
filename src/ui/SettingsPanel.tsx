import React from 'react';
import {Modal,ScrollView,StyleSheet,Switch,Text,TextInput,TouchableOpacity,View} from 'react-native';
import {AppSettings,Quality} from '../features/settings';
export function Choice({label,selected,onPress,disabled=false}:{label:string;selected?:boolean;onPress:()=>void;disabled?:boolean}){return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.choice,selected&&s.selected,disabled&&{opacity:.3}]}><Text style={[s.choiceText,selected&&{color:'#14171e'}]}>{label}</Text></TouchableOpacity>}
export function SettingsPanel({visible,onClose,settings,update,qualities}:{visible:boolean;onClose:()=>void;settings:AppSettings;update:(v:Partial<AppSettings>)=>void;qualities:Quality[]}){
 const row=(label:string,options:readonly string[],values:readonly string[],selected:string,key:keyof AppSettings)=><><Text style={s.label}>{label}</Text><View style={s.row}>{options.map((text,i)=><Choice key={text} label={text} selected={selected===values[i]} onPress={()=>update({[key]:values[i]})}/>)}</View></>;
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={s.back}><View style={s.panel}>
  <View style={s.header}><Text style={s.title}>Настройки съёмки</Text><TouchableOpacity onPress={onClose}><Text style={s.close}>Готово</Text></TouchableOpacity></View>
  <ScrollView contentContainerStyle={s.content}>
   <Text style={s.label}>Качество видео · 30 кадров/с</Text><View style={s.row}>{(['720','1080','4k'] as Quality[]).map((q,i)=><Choice key={q} label={['720p','Full HD','4K'][i]} selected={settings.quality===q} disabled={!qualities.includes(q)} onPress={()=>update({quality:q})}/>)}</View>
   <Text style={s.hint}>Не поддерживаемые этой камерой режимы недоступны. Под видоискателем указано фактическое разрешение.</Text>
   {row('Формат сохранения',['Вертикально 9:16','Исходный','Квадрат','16:9'],['9:16','original','1:1','16:9'],settings.aspect,'aspect')}
   {row('Звук',['Живой','Плёночный','Без звука'],['live','vintage','mute'],settings.audioMode,'audioMode')}
   <Text style={s.hint}>Живой звук — запись микрофона без искусственного треска. Плёночный — мягкое ограничение высоких частот. Исходный кусок можно прослушать до склейки.</Text>
   <View style={s.toggle}><Text style={s.label}>Штамп даты и времени</Text><Switch value={settings.dateEnabled} onValueChange={v=>update({dateEnabled:v})} trackColor={{true:'#e9b77c'}}/></View>
   <TextInput value={settings.dateText} editable={settings.dateEnabled} onChangeText={dateText=>update({dateText})} maxLength={48} placeholder="Текущая дата автоматически" placeholderTextColor="#777f8e" style={s.input}/>
   <Text style={s.hint}>Можно написать свою дату или короткий титр. Пустое поле включает текущую дату.</Text>
   <View style={s.toggle}><Text style={s.label}>REC на сохранённом видео</Text><Switch value={settings.showRec} onValueChange={v=>update({showRec:v})} trackColor={{true:'#e9b77c'}}/></View>
   {row('Оформление',['Современное','Ретро-камера'],['modern','retro'],settings.theme,'theme')}
   <Text style={s.hint}>Фото и видео остаются на телефоне. Камеры бесплатные, водяного знака и лимита записи нет. Исходники черновика удаляются отдельно от сохранённых работ.</Text>
  </ScrollView>
 </View></View></Modal>
}
const s=StyleSheet.create({back:{flex:1,backgroundColor:'#0009',justifyContent:'flex-end'},panel:{maxHeight:'90%',backgroundColor:'#191e28',borderTopLeftRadius:26,borderTopRightRadius:26},header:{flexDirection:'row',justifyContent:'space-between',padding:22},title:{color:'#faf2e7',fontSize:19,fontWeight:'700'},close:{color:'#edbd85',fontSize:16,padding:3},content:{padding:20,paddingTop:0,paddingBottom:36},label:{color:'#eee',fontSize:14,fontWeight:'600',marginTop:16,marginBottom:8},row:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{borderRadius:10,backgroundColor:'#303744',paddingHorizontal:12,paddingVertical:10},selected:{backgroundColor:'#e9b77c'},choiceText:{color:'#e2e5eb',fontSize:12,fontWeight:'600'},hint:{color:'#a0a7b4',fontSize:12,lineHeight:18,marginTop:9},toggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},input:{backgroundColor:'#10151e',borderWidth:1,borderColor:'#3b4350',borderRadius:10,color:'#fff',padding:12}});
