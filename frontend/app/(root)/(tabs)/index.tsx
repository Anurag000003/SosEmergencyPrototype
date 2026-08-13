import { useAuth, useUser } from "@/components/AuthProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
  Platform,
  Modal,
  ActivityIndicator,
  FlatList,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmergencyBanner from "@/components/EmergencyBanner";
import { useAudioPlayer } from "expo-audio";
import * as SMS from "expo-sms";
import { bluetoothMeshService } from "@/lib/bluetoothMeshService";
import MeshStatusCard from "@/components/MeshStatusCard";

const backendUri = process.env.EXPO_PUBLIC_BACKEND_URI || "http://127.0.0.1:8000";
const API_URL = `${backendUri}/api`;

const readUriAsBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Clean = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64Clean);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
  }
};

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  const [images, setImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSirenEnabled, setIsSirenEnabled] = useState(true);
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState<any[]>([]);
  const [isDoctorModalVisible, setIsDoctorModalVisible] = useState(false);
  const [isFetchingDoctors, setIsFetchingDoctors] = useState(false);
  const player = useAudioPlayer(require('../../../assets/siren.wav'));

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('stopSiren', () => {
      setIsSirenEnabled(false);
      setIsSending(false);
      try {
        if (player) {
          player.pause();
        }
      } catch (e) {}
    });
    return () => sub.remove();
  }, [player]);



  const processAndAnalyzeImage = async (uri: string) => {
    try {
      // 1. Compress and resize image
      const processed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      const newUri = processed.uri;
      setImages((prev) => {
        if (prev.length >= 5) return prev;
        return [...prev, newUri];
      });

      // 2. AI Auto-describe temporarily removed per user request

    } catch (error) {
      console.error("Error processing image:", error);
    }
  };

  const handlePickImage = async () => {
    Alert.alert(
      "Add Photo",
      "Choose an option to add a photo",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
              if (!cameraPerm.granted) {
                Alert.alert("Permission Required", "Please allow camera access to take photos.");
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1, // Capture at high quality, compress later
              });
              if (!result.canceled) {
                const capturedUri = result.assets[0].uri;
                if (images.length >= 5) {
                  Alert.alert('Limit Exceeded', 'You can only select up to 5 images in total.');
                } else {
                  await processAndAnalyzeImage(capturedUri);
                }
              }
            } catch (error) {
              console.error("Error launching camera:", error);
            }
          }
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permissionResult.granted) {
                Alert.alert("Permission Required", "Please allow access to your library.");
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 1,
              });
              if (!result.canceled) {
                const selectedUris = result.assets.map(asset => asset.uri);
                if (images.length + selectedUris.length > 5) {
                  Alert.alert('Limit Exceeded', 'You can only select up to 5 images in total.');
                  const availableSlots = 5 - images.length;
                  for (const uri of selectedUris.slice(0, availableSlots)) {
                    await processAndAnalyzeImage(uri);
                  }
                } else {
                  for (const uri of selectedUris) {
                    await processAndAnalyzeImage(uri);
                  }
                }
              }
            } catch (error) {
              console.error("Error picking image:", error);
            }
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handlePickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Video size must not exceed 50 MB.');
          return;
        }
        setVideoUri(asset.uri);
      }
    } catch (error) {
      console.error("Error picking video:", error);
    }
  };

  const getAIAnalysis = async (uri: string, type: "image" | "video") => {
    // Bypassing AI Analysis as requested to prevent network fetch errors
    return { text: "", is_emergency: false };
  };

  const handleSendSOS = async () => {
    if (images.length === 0 || !message.trim()) {
      Alert.alert("Missing Information", "Please provide at least one image and an emergency message.");
      return;
    }
    if (!user) return;

    setIsFetchingDoctors(true);
    setIsDoctorModalVisible(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/doctor/available`, {
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "x-worker-id": user?.id || "anonymous"
        }
      });
      const data = await response.json();
      
      const dummyDoctors = [
        {
          id: "dummy-doc-1",
          name: "Dr. Sarah Jenkins",
          doctor_specialities: [{ speciality: "Cardiology" }, { speciality: "Internal Medicine" }]
        },
        {
          id: "dummy-doc-2",
          name: "Dr. Ahmed Khan",
          doctor_specialities: [{ speciality: "Dermatology" }, { speciality: "Pathology" }]
        },
        {
          id: "dummy-doc-3",
          name: "Dr. Emily Chen",
          doctor_specialities: [{ speciality: "Trauma Surgery" }, { speciality: "Emergency Medicine" }]
        },
        {
          id: "dummy-doc-4",
          name: "Dr. Marcus Thorne",
          doctor_specialities: [{ speciality: "Pediatrics" }]
        }
      ];

      const docs = data.status === "success" ? (data.data || []) : [];
      // Inject dummy doctors for testing
      docs.push(...dummyDoctors);
      
      setAvailableDoctors(docs);
    } catch (e) {
      console.warn("Could not fetch doctors", e);
      
      const dummyDoctors = [
        {
          id: "dummy-doc-1",
          name: "Dr. Sarah Jenkins",
          doctor_specialities: [{ speciality: "Cardiology" }, { speciality: "Internal Medicine" }]
        },
        {
          id: "dummy-doc-2",
          name: "Dr. Ahmed Khan",
          doctor_specialities: [{ speciality: "Dermatology" }, { speciality: "Pathology" }]
        },
        {
          id: "dummy-doc-3",
          name: "Dr. Emily Chen",
          doctor_specialities: [{ speciality: "Trauma Surgery" }, { speciality: "Emergency Medicine" }]
        },
        {
          id: "dummy-doc-4",
          name: "Dr. Marcus Thorne",
          doctor_specialities: [{ speciality: "Pediatrics" }]
        }
      ];
      
      // Inject dummy doctors even if fetch fails
      setAvailableDoctors(dummyDoctors);
    } finally {
      setIsFetchingDoctors(false);
    }
  };

  const executeSOS = async (assigned_doctor_id?: string) => {
    setIsDoctorModalVisible(false);
    setIsSending(true);

    try {
      if (isSirenEnabled) {
        try {
          player.loop = true;
          player.play();
        } catch (e) {
          console.error("Failed to play siren:", e);
        }
      }

      let locationText = "Location: Unavailable";
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          locationText = `Location: https://maps.google.com/?q=${location.coords.latitude},${location.coords.longitude}`;
        }
      } catch (e) {
        console.warn("Failed to get location", e);
      }

      const workerName = user?.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() 
        : "Unknown Health Worker";
      const workerPhone = user?.phone || emergencyContact || "Unknown Phone";

      let finalMessage = `[SOS ALERT]\nHealth Worker: ${workerName}\nPhone: ${workerPhone}\n${locationText}\n\nSymptoms: ${message}`;

      const uploadMedia = async (uri: string, type: "image" | "video") => {
        const base64 = await readUriAsBase64(uri);
        
        const ext = type === "video" ? "mp4" : "jpg";
        const fileName = `sos_${Date.now()}_${type}.${ext}`;
        const filePath = `${user?.id || 'anonymous'}/${fileName}`;
        const contentType = type === "video" ? "video/mp4" : "image/jpeg";
        
        let uploadError: any = null;
        try {
          const res = await supabase.storage
            .from("medical_images")
            .upload(filePath, decode(base64), { contentType });
          uploadError = res.error;
        } catch (e) {
          uploadError = e;
        }

        if (uploadError) {
          console.log("[TEST MODE] Storage upload skipped (DB missing). Using local URI.");
          // If upload fails in demo mode, return the local URI so it still renders in the Alerts tab!
          const aiSummary = await getAIAnalysis(uri, type);
          return { url: uri, aiSummary };
        }

        // Security Fix: Do not generate a public URL. 
        // Pass the private filePath. The backend will generate Signed URLs for assigned doctors.
        const aiSummary = await getAIAnalysis(uri, type);
        return { url: filePath, aiSummary };
      };

      let imageUrls: string[] = [];
      for (const uri of images) {
        const result = await uploadMedia(uri, "image");
        imageUrls.push(result.url);
        finalMessage += result.aiSummary.text;
      }

      if (videoUri) {
        const result = await uploadMedia(videoUri, "video");
        imageUrls.push(result.url);
        finalMessage += result.aiSummary.text;
      }

      let lat = 0, lon = 0;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      } catch (e) {}
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_URL}/sos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
          "x-worker-id": user?.id || ""
        },
        body: JSON.stringify({
          case_description: finalMessage,
          severity: "HIGH",
          latitude: lat,
          longitude: lon,
          assigned_doctor_id: assigned_doctor_id
        })
      });
      const data = await response.json();
      
      // Save for dummy alerts
      try {
        await AsyncStorage.setItem('last_dummy_sos', JSON.stringify({
          message: finalMessage,
          image_url: imageUrls[0] || null,
          assigned_doctor_id: assigned_doctor_id
        }));
      } catch (e) {}
      
      Alert.alert("SOS Sent", data.message || "Emergency message has been securely sent.");
      setImages([]);
      setVideoUri(null);
      setMessage("");

    } catch (error: any) {
      console.warn("SOS Network Error:", error);
      Alert.alert("Network Error", "Failed to send SOS. Please check your internet connection and try again.");
      setIsSending(false);
    }
  };

  const handleTestSMS = async () => {
    setIsSending(true);
    
    try {
      let locationText = "Location: Unavailable";
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          locationText = `Location: https://maps.google.com/?q=${loc.coords.latitude},${loc.coords.longitude}`;
        }
      } catch (e) {
        console.warn("Failed to get location", e);
      }

      const workerName = user?.user_metadata?.first_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() 
        : "Unknown Health Worker";

      let finalMessage = `[OFFLINE SOS]\nHealth Worker: ${workerName}\nPhone: ${emergencyContact}\n${locationText}\n\nSymptoms: ${message}`;
      
      try {
        await AsyncStorage.setItem('last_dummy_sos', JSON.stringify({
          message: finalMessage,
          image_url: null,
          assigned_doctor_id: null
        }));
      } catch (e) {}

      const logs = bluetoothMeshService.getLogs().join("\\n");
      Alert.alert("Offline Mesh Logs", logs || "No logs available. Mesh simulated.");

    } catch (error) {
      console.warn("Test SMS failed:", error);
      Alert.alert("Error", "Failed to simulate offline SMS.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-6 flex-row items-center justify-between border-b border-border bg-card">
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-10 h-10 bg-destructive/10 border border-destructive/30 rounded-full items-center justify-center mr-3"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-accent text-xs font-bold uppercase tracking-wider mb-1">
            Arogya Health
          </Text>
          <Text className="text-primary text-xl font-bold" numberOfLines={1}>
            Hi, {user?.user_metadata?.first_name ?? "Patient"} 👋
          </Text>
        </View>

        <Image
          source={{ uri: user?.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=User" }}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#ea7a53' }}
        />
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
        
        <EmergencyBanner />

        {/* <MeshStatusCard /> */}

        {/* Emergency Quick Stats Card */}
        <Card className="mb-6 bg-card/80">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 items-center border-r border-border pr-2">
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons name="time" size={14} color="#ea7a53" />
                <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Response</Text>
              </View>
              <Text className="text-primary font-bold text-base">~2.4m</Text>
            </View>

            <View className="flex-1 items-center border-r border-border px-2">
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons name="navigate" size={14} color="#0284c7" />
                <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Hospital</Text>
              </View>
              <Text className="text-primary font-bold text-base">1.2 km</Text>
            </View>

            <View className="flex-1 items-center pl-2">
              <View className="flex-row items-center gap-1 mb-1">
                <Ionicons name="pulse" size={14} color="#16a34a" />
                <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Status</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Text className="text-emerald-600 font-bold text-base">Online</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card className="mb-6">
          <Text className="text-primary font-bold mb-4 text-base">
            1. Image Upload (Max 5) <Text className="text-red-500">*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {images.map((uri, index) => (
              <View key={index} className="relative w-28 h-28 rounded-2xl overflow-hidden mr-3 border border-border">
                <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity 
                  onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                >
                  <Ionicons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity 
                onPress={handlePickImage}
                className="w-28 h-28 bg-muted rounded-2xl border-2 border-dashed border-border items-center justify-center mr-3"
              >
                <View className="w-10 h-10 bg-accent/20 rounded-full items-center justify-center mb-1">
                  <Ionicons name="camera" size={20} color="#ea7a53" />
                </View>
                <Text className="text-muted-foreground font-medium text-xs mt-1">Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Card>

        <Card className="mb-6">
          <Text className="text-primary font-bold mb-4 text-base">
            2. Video Upload (Max 50MB) <Text className="text-muted-foreground font-normal">(Optional)</Text>
          </Text>
          <TouchableOpacity
            onPress={handlePickVideo}
            className="w-full h-40 bg-muted rounded-2xl border-2 border-dashed border-border items-center justify-center overflow-hidden"
          >
            {videoUri ? (
              <View className="items-center bg-primary w-full h-full justify-center">
                <Ionicons name="play-circle" size={48} color="white" />
                <Text className="text-background mt-2 font-medium">Video Attached</Text>
              </View>
            ) : (
              <View className="items-center">
                <View className="w-12 h-12 bg-accent/20 rounded-full items-center justify-center mb-2">
                  <Ionicons name="videocam" size={24} color="#ea7a53" />
                </View>
                <Text className="text-muted-foreground font-medium text-sm mt-1">Tap to add video</Text>
              </View>
            )}
          </TouchableOpacity>
        </Card>

        <Card className="mb-8">
          <Text className="text-primary font-bold mb-4 text-base">
            3. Emergency Contact <Text className="text-muted-foreground font-normal">(For Offline SMS)</Text>
          </Text>
          <View className="bg-background rounded-2xl border border-border p-4 mb-6">
            <TextInput
              placeholder="e.g. +91 9876543210"
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              keyboardType="phone-pad"
              className="text-primary text-base"
              style={{ fontFamily: 'Rubik_400Regular' }}
            />
          </View>

          <Text className="text-primary font-bold mb-4 text-base">
            4. Describe Emergency <Text className="text-red-500">*</Text>
          </Text>
          <View className="bg-background rounded-2xl border border-border p-4 min-h-[120px] mb-4">
            <TextInput
              multiline
              placeholder="Please describe symptoms in detail..."
              placeholderTextColor="rgba(0, 0, 0, 0.4)"
              value={message}
              onChangeText={setMessage}
              className="text-primary text-base flex-1"
              style={{ textAlignVertical: 'top', fontFamily: 'Rubik_400Regular' }}
            />
          </View>
          
          <TouchableOpacity 
            className="flex-row items-center pt-2"
            onPress={() => setIsSirenEnabled(!isSirenEnabled)}
          >
            <View className={`w-6 h-6 rounded border ${isSirenEnabled ? 'bg-primary border-primary' : 'border-border bg-muted'} items-center justify-center mr-3`}>
              {isSirenEnabled && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text className="text-primary font-medium flex-1">Sound Siren on SOS</Text>
            <Ionicons name={isSirenEnabled ? "volume-high" : "volume-mute"} size={20} color={isSirenEnabled ? "#ea7a53" : "gray"} />
          </TouchableOpacity>
        </Card>

        {player.playing && (
          <Button 
            label="Stop Siren"
            icon="volume-mute"
            variant="secondary"
            onPress={() => {
              player.pause();
            }}
            className="mb-4"
          />
        )}

        <Button 
          label="Send SOS to Doctor"
          icon="alert-circle"
          variant="danger"
          isLoading={isSending}
          disabled={images.length === 0 || message.trim().length === 0}
          onPress={handleSendSOS}
          className="mb-4"
        />

        <Button 
          label="Test Offline SMS"
          icon="chatbubble-ellipses"
          variant="secondary"
          disabled={message.trim().length === 0}
          onPress={handleTestSMS}
          className="mb-4"
        />

        <Button 
          label="Find Nearby Hospitals"
          icon="map"
          variant="secondary"
          onPress={() => Linking.openURL('https://www.google.com/maps/search/hospitals+near+me')}
          className="mb-4"
        />
        
      </ScrollView>

      {/* DOCTOR SELECTION MODAL */}
      <Modal visible={isDoctorModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-background rounded-t-3xl p-5 min-h-[50%] max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-primary">Assign Doctor</Text>
              <TouchableOpacity onPress={() => setIsDoctorModalVisible(false)} className="p-2">
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {isFetchingDoctors ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" color="#ea7a53" />
                <Text className="text-muted-foreground mt-3">Finding available doctors...</Text>
              </View>
            ) : availableDoctors.length === 0 ? (
              <View className="items-center py-10">
                <Ionicons name="warning" size={48} color="#dc2626" />
                <Text className="text-primary font-bold mt-3 text-center">No Doctors Available!</Text>
                <Text className="text-muted-foreground text-center mt-2 mb-6">
                  Would you like the engine to auto-allocate or escalate?
                </Text>
                <Button label="Auto-Allocate Anyway" icon="flash" onPress={() => executeSOS()} />
              </View>
            ) : (
              <FlatList
                data={availableDoctors}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => executeSOS(item.id)}
                    className="flex-row items-center bg-card p-4 rounded-2xl border border-border mb-3"
                  >
                    <View className="w-12 h-12 rounded-full bg-accent/20 items-center justify-center mr-3">
                      <Ionicons name="medkit" size={24} color="#ea7a53" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-primary font-bold">{item.name}</Text>
                      <Text className="text-muted-foreground text-sm">{item.doctor_specialities?.[0]?.speciality || 'General Medicine'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                  </TouchableOpacity>
                )}
                ListHeaderComponent={() => (
                  <Button 
                    label="⚡ Auto-Allocate (Let Engine Decide)" 
                    variant="secondary" 
                    className="mb-4"
                    onPress={() => executeSOS()} 
                  />
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
