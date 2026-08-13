import { Redirect } from "expo-router";
import { useAuth } from "@/components/AuthProvider";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) return <Redirect href="/(root)/(tabs)" />;

  return <Redirect href="/sign-in" />;
}
