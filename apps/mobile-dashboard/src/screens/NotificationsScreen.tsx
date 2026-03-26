import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { styles } from './NotificationsScreen.styles';

export function NotificationsScreen() {
  const { items, unread } = useNotifications();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Уведомления</Text>
        <Text style={styles.sub}>{unread} непрочитанных</Text>
      </View>

      {items.map(n => (
        <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
          <View style={[styles.iconWrap, { backgroundColor: n.color + '1A' }]}>
            <View style={[styles.iconDot, { backgroundColor: n.color }]} />
          </View>
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text style={styles.ntTitle}>{n.title}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
            <Text style={styles.bodyText}>{n.body}</Text>
          </View>
          {!n.read && <View style={styles.unreadDot} />}
        </View>
      ))}
    </ScrollView>
  );
}
