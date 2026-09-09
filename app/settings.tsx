import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationCategory,
  type NotificationSettings,
} from '@/src/domain/types';
import { useNotificationPermissions } from '@/src/providers/notification-permissions-provider';
import { useRepository } from '@/src/providers/repository-provider';

/**
 * The three v1 categories with the copy that describes them (DESIGN.md §3.21.1).
 * Each line has to read as what the category actually is — an invitation, a
 * shared win, or warmth — because a user deciding what to allow deserves to know
 * exactly what they'd be letting in.
 */
const CATEGORY_ROWS: { category: NotificationCategory; title: string; blurb: string }[] = [
  {
    category: 'reminder',
    title: 'Reminders',
    blurb: 'A gentle nudge when a session is waiting for you. Always an invitation.',
  },
  {
    category: 'celebration',
    title: 'Celebrations',
    blurb: 'A little cheer after you finish a week, reach a level, or hit a milestone.',
  },
  {
    category: 're-engagement',
    title: 'Check-ins',
    blurb: 'A warm hello if it has been a while. Never a nag.',
  },
];

/**
 * Notification settings — the per-category toggles §3.21.2 defers to this screen,
 * plus the second, calmer chance to opt in.
 *
 * Opt-in is a *single* friendly ask at onboarding, so this is where a user tunes
 * the categories afterwards. It is also the re-ask surface: "not now" on the
 * onboarding pre-prompt is deliberately soft, and the OS prompt it left unburned
 * can still be fired from here. Once the OS itself holds a "no", nothing in the
 * app can re-prompt — so we say where to change it instead of pretending.
 *
 * Toggling a category never sends anything; the policy engine
 * (src/domain/notification-policy.ts) reads these when deciding eligibility, and
 * yields nothing at all without an OS grant. Because that gate reads the *stored*
 * permission, this screen re-reads the real one from the OS on mount and repairs
 * the stored copy — a permission revoked in the system settings has to land.
 */
export default function SettingsScreen() {
  const repository = useRepository();
  const permissions = useNotificationPermissions();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([repository.getNotificationSettings(), permissions.getStatus()]).then(
      ([stored, osPermission]) => {
        if (!active) {
          return;
        }
        // Null means the pre-prompt has never been answered — start from the
        // defaults so the screen shows what opting in would give them.
        const base = stored ?? DEFAULT_NOTIFICATION_SETTINGS;
        setSettings({ ...base, osPermission });
        // The stored permission is a cache, and the user can revoke ours in the
        // system settings behind our back. Reconciling on mount keeps the policy
        // engine's hard gate from ever running on a stale grant.
        if (stored !== null && stored.osPermission !== osPermission) {
          void repository.saveNotificationSettings({ ...base, osPermission });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [repository, permissions]);

  if (settings === null) {
    return <View style={styles.container} />;
  }

  const current = settings;

  function persist(next: NotificationSettings) {
    setSettings(next);
    void repository.saveNotificationSettings(next);
  }

  function toggle(category: NotificationCategory) {
    persist({
      ...current,
      categories: { ...current.categories, [category]: !current.categories[category] },
    });
  }

  async function turnOn() {
    const osPermission = await permissions.request();
    persist({ ...current, prePrompt: 'accepted', osPermission });
  }

  const granted = current.osPermission === 'granted';
  const osHoldsTheNo = current.osPermission === 'denied';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!granted && (
        <View style={styles.section} testID="permission-state">
          {osHoldsTheNo ? (
            <Text style={styles.blurb}>
              Notifications are switched off for RunQuest in your phone&apos;s system settings.
              You can turn them back on there whenever you like — everything below is waiting.
            </Text>
          ) : (
            <>
              <Text style={styles.blurb}>
                Reminders and celebrations are off. Turn them on and you stay in control of
                which ones you get.
              </Text>
              <Pressable onPress={turnOn}>
                <Text style={styles.action}>Turn on notifications</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {CATEGORY_ROWS.map(({ category, title, blurb }) => (
        <View key={category} style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Switch
              testID={`toggle-${category}`}
              value={current.categories[category]}
              onValueChange={() => toggle(category)}
            />
          </View>
          <Text style={styles.blurb}>{blurb}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#eff6ff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  blurb: {
    fontSize: 15,
    lineHeight: 21,
    color: '#4b5563',
    marginTop: 6,
  },
  action: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 12,
  },
});
