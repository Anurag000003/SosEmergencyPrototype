import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSignUpPress = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/");
    } else {
      setErrorMsg("Check your email for the confirmation link!");
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="bg-white"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 justify-center px-6 py-12">
        <Image
          source={require("../../assets/images/logo.png")}
          className="w-24 h-10 mb-2"
          resizeMode="contain"
        />
        <Text className="text-2xl font-bold text-[#ea7a53] mb-6">
          Arogya Health
        </Text>
        <Text className="text-3xl font-bold text-gray-800 mb-2">
          Create account
        </Text>
        <Text className="text-gray-500 mb-8">Find your dream home today</Text>

        <View className="flex-row gap-3 mb-4">
          <TextInput
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
            placeholder="First name"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <TextInput
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
            placeholder="Last name"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>

        <TextInput
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-6"
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        {errorMsg ? (
          <Text className="text-red-500 mb-4 text-center">{errorMsg}</Text>
        ) : null}

        <TouchableOpacity
          onPress={onSignUpPress}
          disabled={isLoading}
          className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-base">Sign Up</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-500">Already have an account? </Text>
          <Link href="/sign-in">
            <Text className="text-blue-600 font-semibold">Sign In</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
