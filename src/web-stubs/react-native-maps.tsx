// Web stand-in for react-native-maps, which is native-only and breaks the web
// bundle. Renders a plain placeholder area so the rest of the app can run in a
// browser (used for previews only — real builds are iOS/Android).
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

export const PROVIDER_GOOGLE = 'google';

export default function MapView({ style, ...rest }: ViewProps) {
  return (
    <View style={[styles.map, style]} {...rest}>
      <Text style={styles.label}>Map (native only)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    alignItems: 'center',
    backgroundColor: '#dce8dc',
    justifyContent: 'center',
  },
  label: {
    color: '#5a6b5a',
  },
});
