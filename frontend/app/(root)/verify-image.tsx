import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const backendUri = process.env.EXPO_PUBLIC_BACKEND_URI || "http://127.0.0.1:8000";
const API_URL = `${backendUri}/api/verify`;

const ALGORITHMS = [
  { id: "MobileNetV2", name: "MobileNetV2 (Fastest)" },
  { id: "ResNet50", name: "ResNet50 (Fast/High Accuracy)" },
  { id: "InceptionV3", name: "InceptionV3 (Slow/Higher Accuracy)" },
  { id: "DenseNet121", name: "DenseNet121 (Slower/Highest Accuracy)" },
];

export default function VerifyImageScreen() {
  const router = useRouter();
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [algorithm, setAlgorithm] = useState("MobileNetV2");
  const [isVerifying, setIsVerifying] = useState(false);
  const [predictionsData, setPredictionsData] = useState<any[]>([]);

  const handlePickImages = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        setImages(result.assets);
        setPredictionsData([]); // clear old predictions
      }
    } catch (error) {
      console.error("Error picking images:", error);
    }
  };

  const handleVerifyImages = async () => {
    if (images.length === 0) return;

    setIsVerifying(true);
    setPredictionsData([]);

    try {
      const formData = new FormData();
      
      formData.append("algorithm", algorithm);

      images.forEach((img, index) => {
        const filename = img.uri.split("/").pop() || `image_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("images", {
          uri: img.uri,
          name: filename,
          type,
        } as any);
      });

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      const data = await response.json();
      
      if (data.error) {
        Alert.alert("API Error", data.error);
      } else if (data.predictions) {
        setPredictionsData(data.predictions);
      }
    } catch (error) {
      console.error("Error verifying images:", error);
      Alert.alert(
        "Connection Error",
        "Could not connect to the backend API. Make sure the FastAPI server is running on port 8000."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900 text-center mr-6">
          Image Object Recognition
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <Text className="text-gray-500 text-center mb-6 text-base">
          Upload your images and let ImageAI analyze and predict the objects present.
        </Text>

        <Text className="text-gray-700 font-bold mb-2">Algorithm</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 h-12 flex-grow-0">
          {ALGORITHMS.map((algo) => (
            <TouchableOpacity
              key={algo.id}
              onPress={() => setAlgorithm(algo.id)}
              className={`px-4 py-2 mr-2 rounded-full border ${
                algorithm === algo.id 
                  ? "bg-blue-600 border-blue-600" 
                  : "bg-white border-gray-300"
              }`}
            >
              <Text className={`${algorithm === algo.id ? "text-white" : "text-gray-600"} font-medium`}>
                {algo.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={handlePickImages}
          className="w-full h-48 bg-white rounded-3xl border-2 border-dashed border-gray-300 items-center justify-center overflow-hidden mb-6"
        >
          {images.length > 0 ? (
            <View className="flex-row flex-wrap justify-center p-2 gap-2">
              {images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img.uri }}
                  className="w-20 h-20 rounded-xl"
                  resizeMode="cover"
                />
              ))}
            </View>
          ) : (
            <View className="items-center">
              <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="images-outline" size={32} color="#2563EB" />
              </View>
              <Text className="text-gray-600 font-medium">Tap to select images</Text>
            </View>
          )}
        </TouchableOpacity>

        {images.length > 0 && (
          <TouchableOpacity
            onPress={handleVerifyImages}
            disabled={isVerifying}
            className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-2 ${
              isVerifying ? "bg-blue-400" : "bg-blue-600"
            }`}
          >
            {isVerifying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="scan-outline" size={20} color="white" />
            )}
            <Text className="text-white font-bold text-lg">
              {isVerifying ? "Predicting Objects..." : "Predict"}
            </Text>
          </TouchableOpacity>
        )}

        {predictionsData.map((data, idx) => (
          <View key={idx} className="w-full mt-6 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <Text className="text-gray-900 font-bold text-lg mb-2">
              Results for: {data.image}
            </Text>
            
            <View className="flex-row items-center justify-between py-2 border-b-2 border-gray-100 mb-2">
                <Text className="text-gray-900 font-bold">Predictions</Text>
                <Text className="text-gray-900 font-bold">Probability</Text>
            </View>

            {data.predictions.map((p: any, index: number) => (
              <View key={index} className="flex-row items-center justify-between py-3 border-b border-gray-50">
                <Text className="text-gray-700 font-medium capitalize text-base">
                  {p.label.replace(/_/g, " ")}
                </Text>
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                  <Text className="text-blue-700 font-bold">
                    {p.probability}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
