import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { router } from "expo-router";
import { Receipt } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReceiptsScreen() {
  const {
    data: receipts,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data } = await api.get("/receipts");
      return data;
    },
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/receipt/${item.id}`)}
      className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100 flex-row items-center mx-4"
    >
      <View className="bg-blue-50 w-12 h-12 rounded-full items-center justify-center mr-4">
        <Receipt color="#2563eb" size={20} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-gray-900 text-base">
          {item.restaurant.name}
        </Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          {new Date(item.datetime).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-bold text-gray-900 text-lg">
          ${parseFloat(item.totalAmount).toFixed(2)}
        </Text>
        <Text className="text-gray-400 text-xs mt-0.5">
          {item.dishInstances?.length || 0} items
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !isRefetching) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-4">
        <Text className="text-3xl font-bold text-gray-900">Receipts</Text>
      </View>

      <FlatList
        data={receipts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-400 text-lg">No receipts yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
