import { useAuth, useUser } from "@/components/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { bluetoothMeshService } from "@/lib/bluetoothMeshService";

export default function ProfileScreen() {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [isHealthWorker, setIsHealthWorker] = useState(false);
  const [healthWorkerRole, setHealthWorkerRole] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (user?.user_metadata) {
      setAge(user.user_metadata.age || "");
      setBloodGroup(user.user_metadata.blood_group || "");
      setMedicalHistory(user.user_metadata.medical_history || "");
      const isHW = user.user_metadata.is_health_worker || false;
      const isDoc = (user.user_metadata.health_worker_role || "").toLowerCase().includes("doctor") || (user.user_metadata.health_worker_role || "").toLowerCase().includes("dr");
      setIsHealthWorker(isHW);
      setHealthWorkerRole(user.user_metadata.health_worker_role || "");
      setIsVerified(user.user_metadata.is_verified_health_worker || false);
      
      // Initialize/update BLE mesh service identity
      const name = `${user.user_metadata.first_name || ""} ${user.user_metadata.last_name || ""}`.trim() || "User";
      bluetoothMeshService.initialize(user.id, name, isHW, isDoc);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const isDoc = healthWorkerRole.toLowerCase().includes("doctor") || healthWorkerRole.toLowerCase().includes("dr");
      const { error } = await supabase.auth.updateUser({
        data: {
          age: age,
          blood_group: bloodGroup,
          medical_history: medicalHistory,
          is_health_worker: isHealthWorker,
          health_worker_role: healthWorkerRole,
          is_verified_health_worker: isVerified,
        }
      });
      if (error) throw error;
      
      // Dynamic update mesh service
      bluetoothMeshService.updateIdentity(isHealthWorker, isDoc);
      Alert.alert("Success", "Medical profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyJobCard = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      setIsVerifying(true);
      const uri = result.assets[0].uri;
      const filename = uri.split("/").pop() || "jobcard.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      const formData = new FormData();
      formData.append("image", { uri, name: filename, type } as any);

      // Using EXPO_PUBLIC_BACKEND_URI from environment variables
      const backendUri = process.env.EXPO_PUBLIC_BACKEND_URI || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUri}/api/verify-job-card`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.status === "success") {
        setHealthWorkerRole(`${data.extracted_data.role} / ID: ${data.extracted_data.id}`);
        setIsVerified(true);
        Alert.alert("Verification Successful", "Your health worker identity has been verified!");
      } else {
        Alert.alert("Verification Failed", data.error || "Could not verify the job card.");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Error", "An error occurred during verification. Make sure your backend is running.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdateProfileImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to update your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      setIsUpdating(true);

      const base64Image = result.assets[0].base64;
      const uri = result.assets[0].uri;
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : "image/jpeg";
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // await user?.setProfileImage({ file: dataUrl });
      Alert.alert("Success", "Profile picture would be updated here (Storage needed)!");
    } catch (error) {
      console.error("Error updating profile image:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Please try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#ea7a53" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Avatar + Name */}
        <View className="items-center py-8">
          <View className="relative">
            <Image
              source={{ uri: user.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=" + (user.user_metadata?.first_name || "User") }}
              className="w-24 h-24 rounded-full mb-4"
            />
            <TouchableOpacity
              onPress={handleUpdateProfileImage}
              disabled={isUpdating}
              className="absolute bottom-3 right-0 bg-accent rounded-full p-2"
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="camera" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-1">
            <Text className="text-xl font-bold text-primary font-sans">
              {user.user_metadata?.first_name || "User"} {user.user_metadata?.last_name || ""}
            </Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={20} color="#1d9bf0" />
            )}
          </View>
          <Text className="text-muted-foreground mt-1 font-sans mb-4">
            {user.email}
          </Text>

          {/* Skill & Verification Badges */}
          <View className="flex-row flex-wrap justify-center gap-2 px-6">
            <View className="flex-row items-center gap-1.5 bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-full shadow-xs">
              <Ionicons name="medkit" size={14} color="#ea7a53" />
              <Text className="text-accent text-xs font-bold font-sans">First Aid Certified</Text>
            </View>

            <View className="flex-row items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full shadow-xs">
              <Ionicons name="heart" size={14} color="#10b981" />
              <Text className="text-emerald-600 text-xs font-bold font-sans">CPR Trained</Text>
            </View>

            <View className="flex-row items-center gap-1.5 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-full shadow-xs">
              <Ionicons name="sparkles" size={14} color="#0284c7" />
              <Text className="text-sky-600 text-xs font-bold font-sans">AI Triage Verified</Text>
            </View>

            <View className="flex-row items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full shadow-xs">
              <Ionicons name="shield-checkmark" size={14} color="#e11d48" />
              <Text className="text-rose-600 text-xs font-bold font-sans">Emergency Responder</Text>
            </View>
          </View>
        </View>

        {/* Medical Form */}
        <View className="px-6 mb-8">
          <Card>
            <Text className="text-primary font-bold mb-4 text-base font-sans">Medical Profile</Text>
            
            <Text className="text-muted-foreground font-sans mb-1">Age</Text>
            <View className="bg-background rounded-2xl border border-border px-4 py-3 mb-4">
              <TextInput
                placeholder="e.g. 34"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                className="text-primary text-base font-sans"
              />
            </View>

            <Text className="text-muted-foreground font-sans mb-1">Blood Group</Text>
            <View className="bg-background rounded-2xl border border-border px-4 py-3 mb-4">
              <TextInput
                placeholder="e.g. O+"
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={bloodGroup}
                onChangeText={setBloodGroup}
                className="text-primary text-base font-sans"
              />
            </View>

            <Text className="text-muted-foreground font-sans mb-1">Medical History / Allergies</Text>
            <View className="bg-background rounded-2xl border border-border p-4 min-h-[100px] mb-6">
              <TextInput
                multiline
                placeholder="List any existing conditions, allergies, or past surgeries..."
                placeholderTextColor="rgba(0, 0, 0, 0.4)"
                value={medicalHistory}
                onChangeText={setMedicalHistory}
                className="text-primary text-base flex-1"
                style={{ textAlignVertical: 'top', fontFamily: 'Rubik_400Regular' }}
              />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-primary font-bold text-base font-sans">Are you a health worker?</Text>
              <Switch
                value={isHealthWorker}
                onValueChange={setIsHealthWorker}
                trackColor={{ false: "#767577", true: "#ea7a53" }}
                thumbColor={isHealthWorker ? "#fff" : "#f4f3f4"}
              />
            </View>

            {isHealthWorker && (
              <View className="mb-6">
                <Text className="text-muted-foreground font-sans mb-1">Role / Registration Number</Text>
                <View className="bg-background rounded-2xl border border-border px-4 py-3 mb-4 flex-row items-center">
                  <TextInput
                    placeholder="e.g. Registered Nurse (RN) / ID: 12345"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    value={healthWorkerRole}
                    onChangeText={setHealthWorkerRole}
                    className="text-primary text-base font-sans flex-1"
                  />
                  {isVerified && (
                    <Ionicons name="checkmark-circle" size={24} color="#34d399" />
                  )}
                </View>
                {!isVerified && (
                  <TouchableOpacity 
                    onPress={handleVerifyJobCard}
                    disabled={isVerifying}
                    className="flex-row items-center justify-center gap-2 bg-secondary py-3 rounded-2xl border border-border"
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#ea7a53" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={20} color="#ea7a53" />
                        <Text className="text-primary font-medium font-sans">Upload & Verify Job Card</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Button 
              label="Save Medical Profile"
              variant="primary"
              isLoading={isSaving}
              onPress={handleSaveProfile}
            />
          </Card>
        </View>

        {/* Menu Items */}
        <View className="px-6 gap-2 mb-8">
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => Alert.alert("Coming Soon", "Notifications coming soon!")}
          />
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => Alert.alert("Coming Soon", "Settings coming soon!")}
          />
          <MenuItem
            icon="scan-circle-outline"
            label="Test Image Verification"
            onPress={() => router.push("/(root)/verify-image")}
          />
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => Linking.openURL("mailto:piyushagarwalvo@gmail.com?subject=Help")}
          />
        </View>

        {/* Sign Out */}
        <View className="px-6 mt-auto">
          <Button 
            label="Sign Out"
            icon="log-out-outline"
            variant="danger"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-4 bg-card px-4 py-4 rounded-2xl"
    >
      <Ionicons name={icon} size={22} color="#ea7a53" />
      <Text className="flex-1 text-primary font-medium text-base font-sans">
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(0, 0, 0, 0.2)" />
    </TouchableOpacity>
  );
}
