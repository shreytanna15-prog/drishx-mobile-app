import { Redirect } from 'expo-router';

/** Legacy route — cart lives in the customer tab bar. */
export default function CartRedirect() {
  return <Redirect href="/(tabs)/cart" />;
}
