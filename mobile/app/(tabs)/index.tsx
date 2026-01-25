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
import { Link, router } from "expo-router";
import { ArrowRight, DollarSign, Utensils, Receipt } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await api.get("/stats");
      return data;
    },
  });

  const { data: recentReceipts, isLoading: receiptsLoading } = useQuery({
    queryKey: ["recentReceipts"],
    queryFn: async () => {
      const { data } = await api.get("/receipts/recent");
      return data;
    },
  });

  const isLoading = statsLoading || receiptsLoading;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900">Dashboard</Text>
          <Text className="text-gray-500">Welcome back to Dish</Text>
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="bg-green-100 w-10 h-10 rounded-full items-center justify-center mb-3">
              <DollarSign color="#16a34a" size={20} />
            </View>
            <Text className="text-gray-500 text-xs font-medium uppercase">
              Total Spend
            </Text>
            <Text className="text-xl font-bold mt-1">
              ${stats?.totalSpend?.toFixed(2) || "0.00"}
            </Text>
          </View>

          <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="bg-orange-100 w-10 h-10 rounded-full items-center justify-center mb-3">
              <Utensils color="#ea580c" size={20} />
            </View>
            <Text className="text-gray-500 text-xs font-medium uppercase">
              Dishes Tried
            </Text>
            <Text className="text-xl font-bold mt-1">
              {stats?.totalDishes || 0}
            </Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900">
              Recent Receipts
            </Text>
            <Link href="/(tabs)/receipts" asChild>
              <TouchableOpacity className="flex-row items-center">
                <Text className="text-blue-600 font-medium mr-1">View All</Text>
                <ArrowRight size={16} color="#2563eb" />
              </TouchableOpacity>
            </Link>
          </View>

          {recentReceipts?.map((receipt: any) => (
            <TouchableOpacity
              key={receipt.id}
              onPress={() => router.push(`/receipt/${receipt.id}`)}
              className="bg-white p-4 rounded-xl mb-3 shadow-sm border border-gray-100 flex-row items-center"
            >
              <View className="bg-gray-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Receipt color="#666" size={20} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900">
                  {receipt.restaurant.name}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {new Date(receipt.datetime).toLocaleDateString()}
                </Text>
              </View>
              <Text className="font-bold text-gray-900">
                ${parseFloat(receipt.totalAmount).toFixed(2)}
              </Text>
            </TouchableOpacity>
          ))}

          {(!recentReceipts || recentReceipts.length === 0) && (
            <Text className="text-gray-400 text-center py-4">No recent receipts found.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
