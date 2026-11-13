/**
 * Type declarations for CSS imports used by the .web.tsx component variants.
 *
 * Expo generates `expo-env.d.ts` (git-ignored) with these declarations, but it
 * only exists after a dev/build run — CI and a fresh clone would otherwise fail
 * `tsc --noEmit`.
 */

declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.css';
