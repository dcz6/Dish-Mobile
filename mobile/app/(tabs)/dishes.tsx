import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { router } from "expo-router";
import { Utensils, Star } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DishesScreen() {
  const {
    data: dishes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["dishes"],
    queryFn: async () => {
      // Since there's no direct "all dish instances" with details endpoint in the snippet provided,
      // we might need to fetch photos or receipts. However, the original code had /api/dish-photos.
      // Let's assume we want to show a feed of dishes with photos.
      const { data } = await api.get("/dish-photos");
      return data;
    },
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      // If we want to navigate to a dish detail, we need a dish instance ID or dish ID.
      // The photo object has dishInstanceId.
      onPress={() => item.dishInstanceId && router.push(`/dish/${item.dishInstanceId}`)}
      className="bg-white rounded-xl mb-4 shadow-sm border border-gray-100 overflow-hidden mx-4"
    >
      <View className="h-48 w-full bg-gray-200">
        <Image
          source={{ uri: item.imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-2">
            <Text className="font-bold text-lg text-gray-900 mb-1">
              {item.dishInstance?.dish?.name || "Unknown Dish"}
            </Text>
            <Text className="text-gray-500 text-sm">
              {item.dishInstance?.receipt?.restaurant?.name || "Unknown Restaurant"}
            </Text>
          </View>
          {item.dishInstance?.rating && (
            <View className="bg-yellow-100 px-2 py-1 rounded-lg flex-row items-center">
              <Star size={12} color="#ca8a04" fill="#ca8a04" />
              <Text className="text-yellow-700 text-xs font-bold ml-1">
                {item.dishInstance.rating}
              </Text>
            </View>
          )}
        </View>
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
        <Text className="text-3xl font-bold text-gray-900">Dishes</Text>
      </View>

      <FlatList
        data={dishes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-gray-400 text-lg">No dish photos yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
