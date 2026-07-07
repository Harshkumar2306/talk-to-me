import React from 'react';
import { View, StyleSheet } from 'react-native';
import MyChats from '../../../components/MyChats';

export default function ChatsScreen() {
  return (
    <View style={styles.container}>
      <MyChats />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});
