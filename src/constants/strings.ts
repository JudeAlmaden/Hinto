/**
 * All user-facing copy (plan D8).
 *
 * English-only for the MVP. Keep this a flat object of strings: no
 * concatenation, no JSX fragments, placeholders only (`{name}`), so a later
 * i18n pass is a mechanical swap. The tagline is brand copy and lives here too.
 */

export const strings = {
  appName: 'Hinto',
  tagline: 'Gising bago lumagpas.',

  tabs: {
    home: 'Home',
    places: 'Places',
    history: 'History',
    settings: 'Settings',
  },

  home: {
    searchPlaceholder: 'Where are you going?',
    savedHeading: 'Saved',
    seeAll: 'See all',
    recentHeading: 'Recent',
    offlineNote: 'Offline — GPS still works',
    locationsOff: "Location off — Hinto can't alert you",
    fix: 'Fix',
    startJourney: 'Start journey',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End',
  },

  journey: {
    toGo: 'to go',
    accuracy: 'accuracy',
    alertAt: 'alert at',
    updated: 'updated',
    waitingForFix: 'Waiting for GPS',
    stale: 'Stale',
    paused: 'Paused',
    tracking: 'Tracking',
    endConfirmTitle: 'End this journey?',
    endConfirmBody: "You won't be alerted.",
  },

  alarm: {
    headline: "You're close",
    away: '{distance} away',
    imAwake: "I'm awake · End",
    snooze: 'Snooze {minutes} min',
    dismiss: 'Dismiss alarm',
    limitation: 'Silent mode or DND may reduce volume.',
  },

  places: {
    title: 'Places',
    searchPlaceholder: 'Search places',
    emptyTitle: 'No saved places yet',
    emptyBody: 'Save the stops you use often.',
    addPlace: 'Add a place',
    favourites: 'Favourites',
    all: 'All places',
  },

  history: {
    title: 'History',
    emptyTitle: 'No journeys yet',
    emptyBody: 'Plan a journey from Home.',
    clearHistory: 'Clear history',
  },

  settings: {
    title: 'Settings',
    planning: 'Planning',
    reliability: 'Reliability',
    display: 'Display',
    data: 'Data',
    defaultRadius: 'Default alert distance',
    alarmSound: 'Alarm sound',
    vibration: 'Vibration',
    repeatUntilDismissed: 'Repeat until dismissed',
    snoozeDuration: 'Snooze duration',
    preventAccidental: 'Prevent accidental dismissal',
    permissions: 'Permissions & battery',
    testAlarm: 'Test alarm',
    batterySaver: 'Battery-saving mode',
    diagnostics: 'Diagnostics',
    distanceUnit: 'Distance unit',
    clearHistory: 'Clear journey history',
    deleteAll: 'Delete all data',
    resetLocal: 'Reset local data (repair database)',
    replayOnboarding: 'Replay',
  },

  permissions: {
    allowLocation: 'Allow location',
    allowBackground: 'Allow background location',
    allowNotifications: 'Allow notifications',
    notNow: 'Not now',
    openSettings: 'Open settings',
    tryAgain: 'Try again',
    skipForNow: 'Skip for now',
  },

  onboarding: {
    getStarted: 'Get started',
    howItWorks: 'How it works',
    continue: 'Continue',
    ready: "You're set up",
    startUsing: 'Start using Hinto',
  },

  common: {
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    done: 'Done',
    back: 'Go back',
    loading: 'Loading…',
    unavailable: 'Search unavailable',
    androidOnlyTitle: 'Hinto is an Android build',
    androidOnlyBody: 'Open Hinto on an Android device to use journeys and alerts.',
    errorTitle: 'Something went wrong',
    errorBody: 'Hinto hit an unexpected error. Your saved data is still on this phone.',
  },
} as const;

export type Strings = typeof strings;
