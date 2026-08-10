import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route → nested shop product screen (keeps bottom tabs visible). */
export default function LensProductRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/shop/lens-product', params }} />;
}
