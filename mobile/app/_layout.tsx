import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "../global.css";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { OfflineNotice } from "@/src/components/OfflineNotice";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <OfflineNotice />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="receipt/[id]"
              options={{ presentation: "modal", title: "Receipt Details" }}
            />
            <Stack.Screen
              name="dish/[id]"
              options={{ presentation: "modal", title: "Dish Details" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
