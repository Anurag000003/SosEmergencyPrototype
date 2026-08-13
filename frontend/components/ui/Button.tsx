import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export default function Button({
  label,
  icon,
  isLoading,
  variant = "primary",
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  let bgClass = "bg-accent";
  let textClass = "text-primary";

  if (variant === "secondary") {
    bgClass = "bg-accent/10 border border-accent/30";
    textClass = "text-accent";
  } else if (variant === "danger") {
    bgClass = "bg-destructive";
    textClass = "text-white";
  }

  const disabledClass = disabled || isLoading ? "opacity-60" : "";

  return (
    <TouchableOpacity
      className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 shadow-sm ${bgClass} ${disabledClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === "primary" ? "#081126" : "white"} />
      ) : (
        icon && <Ionicons name={icon} size={24} color={variant === "primary" ? "#081126" : variant === 'danger' ? 'white' : '#ea7a53'} />
      )}
      <Text className={`font-bold text-lg uppercase tracking-wider ${textClass}`}>
        {isLoading ? "Processing..." : label}
      </Text>
    </TouchableOpacity>
  );
}
