import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RecordedChunk } from '../recorder/types';
export function ChunkFilmstrip({ chunks, disabled, onOpen, onDelete, onMove }: {
    chunks: RecordedChunk[];
    disabled?: boolean;
    onOpen: (c: RecordedChunk) => void;
    onDelete: (c: RecordedChunk) => void;
    onMove: (id: string, direction: number) => void;
}) {
    if (!chunks.length)
        return <Text style={s.empty}>Запиши первый кусок. Пауза сохранит его в ленту.</Text>;
    return <FlatList horizontal data={chunks} keyExtractor={c => c.id} contentContainerStyle={s.list} showsHorizontalScrollIndicator={false} renderItem={({ item, index }) => <View style={s.card}><TouchableOpacity disabled={disabled} onPress={() => onOpen(item)}>
      {item.thumbnailUri ? <Image source={{ uri: item.thumbnailUri }} style={s.thumb}/> : <View style={[s.thumb, s.blank]}><Text style={s.label}>▶</Text></View>}
      <Text style={s.label}>#{index + 1} · {(item.durationMs / 1000).toFixed(1)} с {item.hasAudio === false ? ' · без звука' : ''}</Text>
    </TouchableOpacity><View style={s.actions}>
      <TouchableOpacity accessibilityLabel="Передвинуть кусок влево" disabled={disabled || index === 0} onPress={() => onMove(item.id, -1)}><Text style={s.action}>←</Text></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Удалить кусок" disabled={disabled} onPress={() => onDelete(item)}><Text style={s.remove}>Удалить</Text></TouchableOpacity>
      <TouchableOpacity accessibilityLabel="Передвинуть кусок вправо" disabled={disabled || index === chunks.length - 1} onPress={() => onMove(item.id, 1)}><Text style={s.action}>→</Text></TouchableOpacity>
    </View></View>}/>;
}
const s = StyleSheet.create({ empty: { color: '#a0a4ae', padding: 14, textAlign: 'center', fontSize: 12 }, list: { paddingHorizontal: 14, gap: 10 }, card: { width: 134, backgroundColor: '#252a35', borderRadius: 12, overflow: 'hidden' }, thumb: { width: 134, height: 68 }, blank: { alignItems: 'center', justifyContent: 'center' }, label: { fontSize: 11, color: '#eee', padding: 5 }, actions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }, action: { color: '#ddd', padding: 8 }, remove: { color: '#ff9f95', fontSize: 11, paddingVertical: 8 } });
