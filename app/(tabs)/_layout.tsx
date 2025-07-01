import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Chat AI with image' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat AI' }} />
    </Tabs>
  );
}
