import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PROVIDER_LABELS, ProviderNotConfiguredError, type AuthProviderId } from '@/src/auth/auth-client';
import { useAuth } from '@/src/providers/auth-provider';

const PROVIDERS: AuthProviderId[] = ['apple', 'google'];

/**
 * Sign-in screen. Reached only by choosing "Create account" — never forced, and
 * never a step the user has to get past to run (DESIGN.md §3.12).
 *
 * One tap per provider, no passwords, no email (PRD user story 7). "Not now"
 * is always present and always works: leaving without an account returns the
 * user to a fully functional app, so this screen can never become a dead end.
 *
 * Apple/Google credentials aren't wired up in this build yet, so pressing a
 * provider today produces the honest "not available yet" line rather than a
 * spinner that goes nowhere. See `src/auth/identity-token-provider.ts` for what
 * turning it on involves.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn(provider: AuthProviderId) {
    setMessage(null);
    setBusy(true);
    try {
      await signIn(provider);
      router.replace('/home');
    } catch (error) {
      setMessage(
        error instanceof ProviderNotConfiguredError
          ? `${PROVIDER_LABELS[provider]} sign-in isn’t available yet. You can keep running without an account.`
          : 'We couldn’t sign you in just now. Your progress is safe on this phone — you can try again any time.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Back up your progress</Text>
      <Text style={styles.body}>
        An account keeps your levels, weeks and runs safe if you change phones. No password, no
        email — one tap.
      </Text>

      {PROVIDERS.map((provider) => (
        <Pressable
          key={provider}
          style={styles.button}
          disabled={busy}
          onPress={() => handleSignIn(provider)}
        >
          <Text style={styles.buttonText}>Continue with {PROVIDER_LABELS[provider]}</Text>
        </Pressable>
      ))}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable style={styles.secondaryButton} onPress={() => router.replace('/home')}>
        <Text style={styles.secondaryButtonText}>Not now</Text>
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
  heading: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  button: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    minWidth: 260,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 20,
  },
  secondaryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
  },
});
