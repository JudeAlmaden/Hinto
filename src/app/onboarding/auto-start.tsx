import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function AutoStartOnboardingScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/onboarding/alarm-test');
  }, [router]);
  return null;
}
