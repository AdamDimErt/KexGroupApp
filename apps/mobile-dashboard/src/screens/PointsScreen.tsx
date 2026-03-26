import React from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { colors } from '../theme';
import { RestaurantCard } from '../components/RestaurantCard';
import { useRestaurantList } from '../hooks/useRestaurantList';
import { styles } from './PointsScreen.styles';

interface Props {
  onPointSelect: (id: string) => void;
}

export function PointsScreen({ onPointSelect }: Props) {
  const { query, setQuery, totalRevenue, filtered } = useRestaurantList();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Рестораны</Text>
        <Text style={styles.total}>₸{(totalRevenue / 1000000).toFixed(2)}M сегодня</Text>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по ресторанам..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.map(r => (
          <RestaurantCard
            key={r.id}
            name={r.name}
            city={r.city}
            type={r.type}
            revenue={r.revenue}
            transactions={r.transactions}
            dev={r.dev}
            status={r.status}
            planPct={r.planPct}
            onPress={() => onPointSelect(r.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
