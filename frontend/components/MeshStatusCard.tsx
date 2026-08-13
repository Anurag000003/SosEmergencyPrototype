import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { bluetoothMeshService, MeshPeer } from "@/lib/bluetoothMeshService";

export default function MeshStatusCard() {
  const [peers, setPeers] = useState<MeshPeer[]>([]);

  useEffect(() => {
    const unsubscribe = bluetoothMeshService.subscribeToPeers((updatedPeers) => {
      setPeers(updatedPeers);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const healthWorkersCount = peers.filter(p => p.isHealthWorker || p.isDoctor).length;

  return (
    <View className="bg-card border border-border rounded-3xl p-5 mb-6 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <Text className="text-primary font-bold text-base">Bluetooth Mesh Active</Text>
        </View>
      </View>

      <Text className="text-muted-foreground text-sm mb-4 leading-relaxed">
        Relaying packets off-grid. Nearby peers will forward emergency signals until they reach response centers.
      </Text>

      <View className="flex-row items-center justify-between bg-muted/50 p-4 rounded-2xl">
        <View className="items-center flex-1 border-r border-border pr-2">
          <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Nearby Nodes</Text>
          <Text className="text-primary font-extrabold text-lg">{peers.length}</Text>
        </View>
        <View className="items-center flex-1 pl-2">
          <Text className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">Responders</Text>
          <Text className="text-emerald-600 font-extrabold text-lg">{healthWorkersCount}</Text>
        </View>
      </View>
    </View>
  );
}
