import { Stack } from 'expo-router';

export default function ShopStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="items" />
      <Stack.Screen name="products" />
      <Stack.Screen name="search" />
      <Stack.Screen name="lens-product" />
    </Stack>
  );
}
