import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { SessionProvider, useSession } from "../lib/SessionContext";

// Same patient Clerk app the web invite-signup flow uses (a second, separate app from the
// dietitian one — see the web CLAUDE.md for why) — used only during the invite-code ->
// Google sign-in -> confirm-details moment (app/(auth)/signup.tsx, details.tsx). Once
// activated, this app's own session (SessionProvider above, SecureStore-backed patientId)
// takes over entirely; Clerk plays no further role after signup.
const patientClerkPublishableKey = process.env.EXPO_PUBLIC_PATIENT_CLERK_PUBLISHABLE_KEY;

function RootNavigator() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!session && !inAuthGroup) {
      router.replace("/(auth)");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [loading, session, segments, router]);

  if (loading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

function Providers({ children }: { children: React.ReactNode }) {
  if (!patientClerkPublishableKey) return <>{children}</>;
  return (
    <ClerkProvider publishableKey={patientClerkPublishableKey} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout() {
  return (
    <Providers>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </Providers>
  );
}
