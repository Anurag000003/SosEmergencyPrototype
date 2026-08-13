import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function MediaPicker() {
  const [images, setImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const handlePickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      
      if (images.length + selectedUris.length > 5) {
        Alert.alert('Limit Exceeded', 'You can only select up to 5 images in total.');
        const availableSlots = 5 - images.length;
        setImages((prev) => [...prev, ...selectedUris.slice(0, availableSlots)]);
      } else {
        setImages((prev) => [...prev, ...selectedUris]);
      }
    }
  };

  const handlePickVideo = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: true, 
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      
      // File size validation: max 50 MB
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Video size must not exceed 50 MB.');
        return;
      }
      setVideoUri(asset.uri);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <View className="w-full gap-4 p-5 bg-white rounded-3xl shadow-sm border border-gray-200 mb-6">
      <Text className="text-gray-800 font-bold text-lg mb-1">Advanced Media Picker</Text>

      {/* Images Section */}
      <View>
        <Text className="text-gray-600 font-medium mb-3">Photos ({images.length}/5)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {images.map((uri, index) => (
            <View key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden mr-3 border border-gray-100">
              <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
              <TouchableOpacity 
                onPress={() => removeImage(index)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity 
              onPress={handlePickImages}
              className="w-24 h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center mr-3"
            >
              <Ionicons name="image" size={24} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs mt-1 font-medium">Add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <View className="h-px bg-gray-100 my-1" />

      {/* Video Section */}
      <View>
        <Text className="text-gray-600 font-medium mb-3">Video (Max 50MB)</Text>
        {videoUri ? (
          <View className="relative w-full h-32 bg-gray-900 rounded-2xl items-center justify-center overflow-hidden border border-gray-200">
            <Ionicons name="play-circle" size={48} color="white" style={{ opacity: 0.9 }} />
            <Text className="text-white text-xs mt-2 font-medium">Video Attached</Text>
            <TouchableOpacity 
              onPress={() => setVideoUri(null)}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 z-10"
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handlePickVideo}
            className="w-full h-24 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center flex-row gap-2"
          >
            <Ionicons name="videocam" size={24} color="#9CA3AF" />
            <Text className="text-gray-500 font-medium">Select Video</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}
