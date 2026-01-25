import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { useLocalSearchParams, router } from "expo-router";
import { MapPin, Calendar, Receipt, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const { data } = await api.get(`/receipts/${id}`);
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Receipt not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="bg-white p-6 pb-8 border-b border-gray-200">
          <Text className="text-3xl font-bold text-center mb-2">{receipt.restaurant.name}</Text>
          <View className="flex-row justify-center items-center mb-6">
             <MapPin size={14} color="#666" className="mr-1" />
             <Text className="text-gray-500 text-sm">
               {receipt.restaurant.address || "No address available"}
             </Text>
          </View>

          <View className="flex-row justify-between items-center bg-gray-50 p-4 rounded-xl">
            <View>
              <Text className="text-gray-400 text-xs uppercase font-medium mb-1">Date</Text>
              <View className="flex-row items-center">
                <Calendar size={14} color="#000" className="mr-1" />
                <Text className="font-medium">
                  {new Date(receipt.datetime).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 text-xs uppercase font-medium mb-1">Total</Text>
              <Text className="text-2xl font-bold">
                ${parseFloat(receipt.totalAmount).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Section */}
        <View className="p-4">
          <Text className="text-gray-500 font-medium mb-3 uppercase text-xs ml-2">Ordered Items</Text>
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {receipt.dishInstances.map((item: any, index: number) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(`/dish/${item.id}`)}
                className={`p-4 flex-row items-center justify-between ${
                  index !== receipt.dishInstances.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-1 mr-4">
                  <Text className="font-semibold text-gray-900 text-lg">{item.dish.name}</Text>
                  {item.rating && (
                    <Text className="text-yellow-600 text-sm mt-1">★ {item.rating}</Text>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="font-medium text-gray-900 mr-2">
                    ${parseFloat(item.price || "0").toFixed(2)}
                  </Text>
                  <ChevronRight size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
