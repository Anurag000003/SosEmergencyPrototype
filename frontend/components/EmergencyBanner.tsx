import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EmergencyBanner() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View className="bg-destructive/10 p-5 rounded-3xl border border-destructive/20 mb-6 flex-row items-center gap-4 shadow-sm">
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }} className="bg-destructive/20 p-3 rounded-full">
        <Ionicons name="warning" size={28} color="#dc2626" />
      </Animated.View>
      <View className="flex-1">
        <Text className="text-destructive font-bold text-lg mb-1">Emergency SOS</Text>
        <Text className="text-destructive/80 text-sm font-medium">
          Upload a photo/video. Our AI will analyze it and send an immediate alert.
        </Text>
      </View>
    </View>
  );
}
