import ChatWithImage from '@/components/chatWithImage';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
 <ChatWithImage />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
