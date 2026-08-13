import { useUserStore } from "@/store/userStore";
import { NativeTabs, Label } from "expo-router/unstable-native-tabs";

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <Label>Profile</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alerts">
        <Label>Alerts</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
