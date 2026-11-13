/**
 * The app's TypeScript config does not pull in Node's ambient types, but the
 * offline-invariant test reads source files to guard D17. These two minimal
 * declarations keep that test honest without teaching the app Node globals.
 */

declare module 'node:fs' {
  export function readFileSync(file: string, encoding: 'utf8'): string;
}

declare module 'node:path' {
  const path: { join(...parts: string[]): string };
  export default path;
}
