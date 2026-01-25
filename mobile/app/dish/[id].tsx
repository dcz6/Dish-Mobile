import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { useLocalSearchParams, router } from "expo-router";
import { Star, Camera, Check } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

const RATINGS = ["Elite", "Would order again", "Should try once", "Not for me"];

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: instance, isLoading } = useQuery({
    queryKey: ["dishInstance", id],
    queryFn: async () => {
      const { data } = await api.get(`/dish-instances/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data } = await api.patch(`/dish-instances/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dishInstance", id] });
      queryClient.invalidateQueries({ queryKey: ["dishes"] }); // refresh lists
      setEditing(false);
    },
  });

  const addPhotoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
        // First create the photo unlinked (or linked immediately)
        // The API schema says { imageUrl, dishInstanceId }
        const { data } = await api.post("/dish-photos", {
            imageUrl,
            dishInstanceId: id,
        });
        return data;
    },
    onSuccess: () => {
        Alert.alert("Success", "Photo added!");
        queryClient.invalidateQueries({ queryKey: ["dishInstance", id] });
    }
  });

  const handleRating = (rating: string) => {
    updateMutation.mutate({ rating });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      // In a real app, you'd upload this to a CDN/S3 and get a URL.
      // Since the current backend seems to handle base64 strings or URLs loosely (based on ReceiptParser),
      // let's check the schema. schema.ts says `imageUrl: text`.
      // If the backend doesn't handle base64 upload to storage, this might fail if the string is too long for a simple text field
      // OR if it expects a URL.
      // However, for this demo plan, we'll assume we can send the data URI or that the user has a way to upload.
      // Re-reading schema: `imageUrl` is text.
      // Re-reading server/routes.ts: `createDishPhoto` just inserts into DB.
      // We will send the base64 data URI for now, as it's the simplest "MVP" approach,
      // although not production ready for large images in Postgres text columns.
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      addPhotoMutation.mutate(uri);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!instance) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Dish not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-6 pb-8 mb-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-center mb-2">{instance.dish.name}</Text>
        <Text className="text-center text-gray-500 text-lg font-medium">
          ${parseFloat(instance.price || "0").toFixed(2)}
        </Text>
      </View>

      {/* Rating Section */}
      <View className="p-4 mb-4">
        <Text className="text-gray-500 font-medium mb-3 uppercase text-xs ml-2">Your Rating</Text>
        <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {RATINGS.map((rating) => (
            <TouchableOpacity
              key={rating}
              onPress={() => handleRating(rating)}
              className={`p-4 flex-row items-center border-b border-gray-100 ${
                instance.rating === rating ? "bg-blue-50" : ""
              }`}
            >
              <Star
                size={20}
                color={instance.rating === rating ? "#2563eb" : "#ccc"}
                fill={instance.rating === rating ? "#2563eb" : "none"}
                className="mr-3"
              />
              <Text className={`text-base ${instance.rating === rating ? "font-bold text-blue-600" : "text-gray-600"}`}>
                {rating}
              </Text>
              {instance.rating === rating && (
                <View className="flex-1 items-end">
                    <Check size={20} color="#2563eb" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Photos Section */}
      <View className="p-4 mb-8">
        <View className="flex-row justify-between items-center mb-3 px-2">
            <Text className="text-gray-500 font-medium uppercase text-xs">Photos</Text>
            <TouchableOpacity onPress={pickImage} className="flex-row items-center">
                <Camera size={16} color="#2563eb" className="mr-1" />
                <Text className="text-blue-600 font-medium text-xs">Add Photo</Text>
            </TouchableOpacity>
        </View>

        {/* We would typically fetch photos for this instance here.
            The current endpoint /api/dish-instances/:id returns just the instance and dish.
            We'd need to modify the backend or filter the global photos list.
            For now, let's just show a placeholder or nothing if we can't easily get them without backend changes.
        */}
        <View className="bg-white p-8 rounded-xl items-center justify-center border border-dashed border-gray-300">
            <Text className="text-gray-400 text-center">
                Photos linked to this dish will appear here.
            </Text>
        </View>
      </View>

    </ScrollView>
  );
}
