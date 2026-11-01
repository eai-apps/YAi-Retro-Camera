import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { RecordedChunk } from '../recorder/types';

interface ChunkFilmstripProps {
  chunks: RecordedChunk[];
}

export const ChunkFilmstrip: React.FC<ChunkFilmstripProps> = ({ chunks }) => {
  if (chunks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Лента пуста. Нажмите «ЗАПИСЬ» для первого куска</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {chunks.map((chunk, index) => {
          const durationSec = (chunk.durationMs / 1000).toFixed(1);
          return (
            <View key={chunk.id} style={styles.filmFrame}>
              {/* Верхняя перфорация плёнки */}
              <View style={styles.perforationRow}>
                <View style={styles.perforationHole} />
                <View style={styles.perforationHole} />
                <View style={styles.perforationHole} />
              </View>

              {/* Тело кадра */}
              <View style={styles.frameBody}>
                <Text style={styles.frameNumber}>#{index + 1}</Text>
                <Text style={styles.frameDuration}>{durationSec} с</Text>
              </View>

              {/* Нижняя перфорация плёнки */}
              <View style={styles.perforationRow}>
                <View style={styles.perforationHole} />
                <View style={styles.perforationHole} />
                <View style={styles.perforationHole} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    height: 60,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 13,
  },
  filmFrame: {
    width: 80,
    height: 56,
    backgroundColor: '#0a0a0a',
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffb300',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  perforationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 2,
    backgroundColor: '#000',
  },
  perforationHole: {
    width: 6,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  frameBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameNumber: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: 'bold',
  },
  frameDuration: {
    color: '#fff',
    fontSize: 11,
  },
});
