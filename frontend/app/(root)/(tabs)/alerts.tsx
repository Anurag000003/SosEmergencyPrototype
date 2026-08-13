import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/AuthProvider";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type SOSAlert = {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  status: string;
  assigned_doctor_id: string | null;
  created_at: string;
};

export default function AlertsScreen() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Check if the user is actually a health worker
  const isHealthWorker = user?.user_metadata?.is_health_worker;

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      // Fetch pending or null status alerts
      const { data, error } = await supabase
        .from("sos_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching alerts:", error);
        return;
      }

      // Filter alerts on client-side to be safe if 'status' column is newly added
      // We want to see alerts that are not accepted, or ones assigned to this doctor
      const activeAlerts = (data || []).filter((alert: SOSAlert) => 
        (alert.status !== 'accepted' && !alert.assigned_doctor_id) || 
        alert.assigned_doctor_id === user?.id
      );

      setAlerts(activeAlerts);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHealthWorker) {
      fetchAlerts();

      // Set up real-time subscription for Option 1
      const subscription = supabase
        .channel("sos_alerts_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sos_alerts" },
          (payload) => {
            console.log("Realtime update:", payload);
            fetchAlerts(); // Refresh list on any change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else {
      setIsLoading(false);
    }
  }, [isHealthWorker]);

  const handleAcceptRequest = async (alertId: string) => {
    if (!user) return;
    setAcceptingId(alertId);
    
    try {
      // Option 1: Atomic Database Update
      // We only update if the assigned_doctor_id is null to prevent race conditions
      const { data, error } = await supabase
        .from("sos_alerts")
        .update({ 
          status: 'accepted', 
          assigned_doctor_id: user.id 
        })
        .eq("id", alertId)
        .is("assigned_doctor_id", null) // ATOMIC CHECK: only update if it's currently unassigned
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        Alert.alert("Success", "You have successfully accepted this request.");
        fetchAlerts();
      } else {
        // If data is empty, it means the update affected 0 rows because someone else got it first!
        Alert.alert("Too Late", "Another doctor has already accepted this request.");
        fetchAlerts(); // Refresh to remove it from the list
      }
    } catch (error: any) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", error.message || "Failed to accept request.");
    } finally {
      setAcceptingId(null);
    }
  };

  if (!isHealthWorker) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
        <Text className="text-xl font-bold text-primary mb-2">Access Denied</Text>
        <Text className="text-center text-muted-foreground">
          You must be a registered health worker to view and accept SOS alerts.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-4 border-b border-border bg-card">
        <Text className="text-2xl font-bold text-primary">Emergency Alerts</Text>
        <Text className="text-muted-foreground text-sm">
          Respond to nearby SOS requests
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#ea7a53" className="mt-10" />
        ) : alerts.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-muted-foreground font-medium">No pending alerts right now.</Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const isAssignedToMe = alert.assigned_doctor_id === user?.id;
            
            return (
              <Card key={alert.id} className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    {new Date(alert.created_at).toLocaleString()}
                  </Text>
                  {isAssignedToMe && (
                    <View className="bg-emerald-500/10 px-2 py-1 rounded">
                      <Text className="text-emerald-600 text-xs font-bold">Assigned to You</Text>
                    </View>
                  )}
                </View>
                
                <Text className="text-primary font-medium text-base mb-4">
                  {alert.message || "No description provided."}
                </Text>

                {!isAssignedToMe ? (
                  <Button
                    label="Accept Request"
                    variant="primary"
                    icon="medkit-outline"
                    isLoading={acceptingId === alert.id}
                    disabled={acceptingId !== null}
                    onPress={() => handleAcceptRequest(alert.id)}
                  />
                ) : (
                  <Button
                    label="Navigate to Patient"
                    variant="secondary"
                    icon="map-outline"
                    onPress={() => Alert.alert("Coming Soon", "Navigation will be available here.")}
                  />
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
