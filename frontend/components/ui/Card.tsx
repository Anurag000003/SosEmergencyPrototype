import React, { useEffect, useRef } from "react";
import { Animated, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
}

export default function Card({ children, className = "", delay = 0, ...props }: CardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      className={`bg-card rounded-3xl border border-border p-5 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
