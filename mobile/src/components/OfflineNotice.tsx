import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView } from "react-native-safe-area-context";

export function OfflineNotice() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  if (isConnected !== false) {
    return null;
  }

  return (
    <SafeAreaView edges={["top"]} className="bg-red-500">
      <View className="bg-red-500 p-2 items-center justify-center">
        <Text className="text-white font-medium text-xs">
          No Internet Connection
        </Text>
      </View>
    </SafeAreaView>
  );
}
