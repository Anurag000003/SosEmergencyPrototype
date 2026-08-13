import { useAuth, useUser } from "@/components/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
  const [emergencyContact, setEmergencyContact] = useState("+917409858971");
  const [isSending, setIsSending] = useState(false);
  const [isSirenEnabled, setIsSirenEnabled] = useState(true);
  const player = useAudioPlayer(require('../../../assets/siren.wav'));



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

      // 2. Auto-describe the image
      const result = await getAIAnalysis(newUri, "image");
      
      setMessage((prevMsg) => {
        const textPart = result.text || "";
        const summary = textPart.includes("--- AI Analysis Summary ---") 
          ? textPart.split("--- AI Analysis Summary ---")[1] 
          : textPart;

        if (result.is_emergency) {
          return "🚨 CRITICAL TRAUMA: HOSPITAL REFERRAL REQUIRED 🚨\n\n" + summary;
        }
        // Append the new AI analysis to the existing message if there is one
        const prefix = prevMsg.trim() ? prevMsg + "\n\n" : "";
        return prefix + "Auto-Detected Symptoms:\n" + summary;
      });

    } catch (error) {
      console.error("Error processing/analyzing image:", error);
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
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() || `media.${type === 'video' ? 'mp4' : 'jpg'}`;
      
      const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
      
      formData.append(type === "video" ? "video" : "images", {
        uri: uri,
        name: filename,
        type: mimeType,
      } as any);

      if (type === "image") formData.append("algorithm", "DenseNet121");
      if (type === "video") formData.append("algorithm", "TinyYOLOv3");

      const endpoint = type === "video" ? "/verify-video" : "/verify";
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();
      
      if (data.error) return { text: "AI Analysis Failed: " + data.error, is_emergency: false };
      
      let aiSummary = "\n\n--- AI Analysis Summary ---\n";
      if (type === "image" && data.predictions) {
         const preds = data.predictions[0]?.predictions || data.predictions;
         preds.forEach((p: any) => {
             aiSummary += `- ${p.label}: ${p.probability}%\n`;
         });
      } else if (type === "video" && data.predictions) {
         data.predictions.forEach((p: any) => {
             aiSummary += `- Detected ${p.label} (Max Confidence: ${p.probability}%)\n`;
         });
      }

      if (data.diet_plan) {
         aiSummary += "\n--- Diet Recommendations ---\n";
         aiSummary += `Foods to eat: ${data.diet_plan.foods_to_eat.join(", ")}\n`;
         aiSummary += `Foods to avoid: ${data.diet_plan.foods_to_avoid.join(", ")}\n`;
      }
      
      if (data.tips && data.tips.length > 0) {
         aiSummary += "\n--- Health Precautions ---\n";
         data.tips.forEach((tip: string) => {
             aiSummary += `- ${tip}\n`;
         });
      }

      return { text: aiSummary, is_emergency: !!data.is_emergency };
    } catch (error) {
        console.error("AI fetch error", error);
        return { text: "\n\n--- AI Analysis Failed to Connect ---\n", is_emergency: false };
    }
  };

  const handleSendSOS = async () => {
    if (images.length === 0 || !message.trim()) {
      Alert.alert("Missing Information", "Please provide at least one image and an emergency message.");
      return;
    }
    if (!user) return;

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

      let finalMessage = message;

      const uploadMedia = async (uri: string, type: "image" | "video") => {
        const base64 = await readUriAsBase64(uri);
        
        const ext = type === "video" ? "mp4" : "jpg";
        const fileName = `sos_${Date.now()}_${type}.${ext}`;
        const filePath = `${user.id}/${fileName}`;
        const contentType = type === "video" ? "video/mp4" : "image/jpeg";
        
        const { error: uploadError } = await supabase.storage
          .from("medical_images")
          .upload(filePath, decode(base64), { contentType });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("medical_images")
          .getPublicUrl(filePath);

        const aiSummary = await getAIAnalysis(uri, type);
        return { url: publicUrlData.publicUrl, aiSummary };
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

      const { error: dbError } = await supabase
        .from("sos_alerts")
        .insert({
          user_id: user.id,
          message: finalMessage,
          image_url: imageUrls[0] || null,
        });

      if (dbError) throw dbError;

      Alert.alert("SOS Sent", "Emergency message with AI Analysis has been securely sent.");
      setImages([]);
      setVideoUri(null);
      setMessage("");

    } catch (error: any) {
      console.warn("SOS Network Error:", error);
      
      const isAvailable = await SMS.isAvailableAsync();
      const options = [
        {
          text: "Cancel",
          style: "cancel" as const
        },
        {
          text: "Hop via BLE Mesh",
          onPress: () => {
            const hasMedia = images.length > 0 || !!videoUri;
            const packet = bluetoothMeshService.broadcastEmergencyPacket(message, hasMedia);
            Alert.alert(
              "Mesh Broadcast Started",
              `SOS emergency signal is hopping across nearby nodes. Packet ID: ${packet.packetId.substring(0, 8)}...`
            );
            setImages([]);
            setVideoUri(null);
            setMessage("");
          }
        }
      ];

      if (isAvailable) {
        options.push({
          text: "Send SMS Fallback",
          onPress: async () => {
            await SMS.sendSMSAsync(
              emergencyContact.trim() ? [emergencyContact.trim()] : [],
              `SOS Alert: ${message.substring(0, 100)}... I need immediate assistance.`
            );
          }
        });
      }

      Alert.alert(
        "Network Unreachable",
        "Your internet connection is offline. Choose to dispatch via Bluetooth Hop Mesh or send an SMS.",
        options
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleTestSMS = async () => {
    if (!emergencyContact.trim()) {
      Alert.alert("Missing Phone Number", "Please enter a phone number in the Emergency Contact field.");
      return;
    }

    setIsSending(true);
    try {
      let imageUrl: string | undefined = undefined;
      
      // Upload first image if available
      if (images.length > 0) {
        try {
          const uri = images[0];
          const base64 = await readUriAsBase64(uri);
          const fileName = `sms_${Date.now()}_image.jpg`;
          const filePath = `${user?.id || 'anonymous'}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from("medical_images")
            .upload(filePath, decode(base64), { contentType: "image/jpeg" });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from("medical_images")
            .getPublicUrl(filePath);

          imageUrl = publicUrlData.publicUrl;
        } catch (uploadErr: any) {
          console.warn("Failed to upload SMS image fallback:", uploadErr);
        }
      }

      // Format SMS text
      let smsMessage = `SOS Alert: ${message || "Emergency situation! Need help."}`;
      if (imageUrl) {
        smsMessage += `\nVerification Image: ${imageUrl}`;
      }

      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync(
          [emergencyContact.trim()],
          smsMessage
        );
      } else {
        const response = await fetch(`${API_URL}/send-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: emergencyContact.trim(),
            message: message || "Emergency situation! Need help.",
            imageUrl: imageUrl || "",
            description: message || ""
          })
        });
        const res = await response.json();
        if (res.success) {
          Alert.alert("SMS Sent!", `Real SMS sent to ${emergencyContact}! Quota remaining: ${res.quotaRemaining}`);
        } else {
          Alert.alert("SMS Failed", res.error || res.message || "Could not send SMS.");
        }
      }
    } catch (e: any) {
      Alert.alert("Request Failed", e.message || "Failed to reach backend SMS service.");
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

        <MeshStatusCard />

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
    </SafeAreaView>
  );
}
