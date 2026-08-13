import { useState } from "react";
import { View, Text, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';

export default function SkinAIScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const pickImage = async () => {
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

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzeSkin = async () => {
    if (!imageUri) return;
    
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const base64Image = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      
      const backendUri = process.env.EXPO_PUBLIC_BACKEND_URI || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUri}/api/predict-skin`, {
        method: "POST",
        body: JSON.stringify({ image_base64: base64Image }),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      
      if (data.status === "success") {
        setResult(data);
      } else {
        Alert.alert("Analysis Failed", data.error || "Could not analyze the image.");
      }
    } catch (error: any) {
      console.error("Skin AI error:", error);
      Alert.alert("Error", "An error occurred during analysis. Make sure both backends are running.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text className="text-2xl font-bold text-primary mb-2 font-sans">Skin AI</Text>
        <Text className="text-muted-foreground mb-6 font-sans">
          Upload an image of a skin lesion for an AI-powered preliminary analysis.
        </Text>
        
        <Card className="mb-6">
          <View className="items-center justify-center p-4 border-2 border-dashed border-border rounded-xl mb-4 bg-muted min-h-[250px]">
            {imageUri ? (
              <Image source={{ uri: imageUri }} className="w-full h-64 rounded-lg" resizeMode="contain" />
            ) : (
              <View className="items-center">
                <View className="w-16 h-16 bg-accent/20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="camera" size={32} color="#ea7a53" />
                </View>
                <Text className="text-muted-foreground text-center font-sans font-medium text-sm">
                  Tap "Select Image" below to choose from your gallery
                </Text>
              </View>
            )}
          </View>
          
          <Button 
            label={imageUri ? "Change Image" : "Select Image"} 
            icon="image-outline" 
            variant={imageUri ? "secondary" : "primary"}
            onPress={pickImage} 
            disabled={isAnalyzing}
          />
        </Card>

        <Button 
          label="Analyze Skin" 
          icon="analytics-outline" 
          variant="primary" 
          onPress={analyzeSkin} 
          isLoading={isAnalyzing}
          disabled={!imageUri || isAnalyzing}
        />

        {result && (
          <Card className="mt-8 border-accent/30 bg-accent/5">
            <Text className="text-lg font-bold text-primary mb-4 font-sans border-b border-border pb-2">Analysis Results</Text>
            
            <View className="mb-4">
              <Text className="text-sm text-muted-foreground font-sans">Prediction</Text>
              <Text className="text-2xl font-bold text-accent capitalize font-sans">{result.prediction.replace(/_/g, " ")}</Text>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm text-muted-foreground font-sans">Confidence</Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <View 
                    className={`h-full ${result.confidence > 0.8 ? 'bg-emerald-500' : result.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                    style={{ width: `${result.confidence * 100}%` }} 
                  />
                </View>
                <Text className="font-bold text-primary font-sans w-12 text-right">
                  {(result.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
            
            {result.is_uncertain && (
              <View className="flex-row items-start gap-2 bg-amber-500/10 p-3 rounded-lg mb-4 border border-amber-500/20">
                <Ionicons name="warning" size={20} color="#f59e0b" />
                <Text className="flex-1 text-sm text-amber-700 font-sans">
                  The model is uncertain about this prediction. Please consult a dermatologist for a professional diagnosis.
                </Text>
              </View>
            )}

            {result.gradcam_image && (
              <View className="mt-4 border-t border-border pt-4">
                <Text className="text-sm font-bold text-primary mb-2 font-sans">Attention Map (GradCAM)</Text>
                <Text className="text-xs text-muted-foreground mb-3 font-sans">
                  Highlights the areas the AI focused on when making this prediction.
                </Text>
                <Image 
                  source={{ uri: result.gradcam_image }} 
                  className="w-full h-48 rounded-lg" 
                  resizeMode="contain" 
                />
              </View>
            )}
            
            <View className="mt-6 p-4 bg-secondary rounded-xl">
              <Text className="text-xs text-muted-foreground text-center font-sans">
                Disclaimer: This tool is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
