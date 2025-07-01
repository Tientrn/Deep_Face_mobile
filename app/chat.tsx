import ChatWithImage from '@/components/chatWithImage';
import React from 'react';
import { View } from 'react-native';

export default function ChatScreen() {
  return (
    <View style={{ flex: 1 }}>
      <ChatWithImage />
    </View>
  );
}
