// Type shims for @expo-google-fonts/* packages.
// These packages are listed in package.json but resolved by npm install at build time.
// Shims prevent tsc errors in pre-install environments.

declare module '@expo-google-fonts/fira-sans' {
  export const FiraSans_400Regular: number;
  export const FiraSans_500Medium: number;
  export const FiraSans_600SemiBold: number;
  export const FiraSans_700Bold: number;
}

declare module '@expo-google-fonts/fira-code' {
  export const FiraCode_400Regular: number;
  export const FiraCode_500Medium: number;
  export const FiraCode_600SemiBold: number;
  export const FiraCode_700Bold: number;
}
