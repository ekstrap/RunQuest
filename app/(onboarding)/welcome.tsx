import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Onboarding screen 1 of 4 — welcome. Sets the friendly, anti-elitist tone
 * (pillar 3) and hands off to the activity-bracket picker. No choices here, so
 * it carries no route params forward.
 */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RunQuest</Text>
      <Text style={styles.tagline}>Start running, one friendly session at a time.</Text>
      <Pressable style={styles.button} onPress={() => router.push('/bracket')}>
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
