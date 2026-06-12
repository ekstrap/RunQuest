import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import type { OnboardingState } from '@/src/domain/types';
import { useRepository } from '@/src/providers/repository-provider';

/**
 * Entry gate. The first thing the app renders: it reads onboarding state through
 * the repository and routes accordingly — a not-yet-onboarded newcomer into the
 * welcome flow, a returning user straight to home. This is what makes onboarding
 * the genuine first-run experience. Renders nothing while the async read is in
 * flight (a frame, in practice).
 */
export default function IndexGate() {
  const repository = useRepository();
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    repository.getOnboardingState().then((state) => {
      if (active) {
        setOnboarding(state);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [repository]);

  if (!loaded) {
    return null;
  }

  return <Redirect href={onboarding ? '/home' : '/welcome'} />;
}
