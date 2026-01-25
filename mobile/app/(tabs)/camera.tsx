import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/lib/api";
import { router } from "expo-router";
import { X, RefreshCcw, Image as ImageIcon, Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [image, setImage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const queryClient = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: async (base64Image: string) => {
      const { data } = await api.post("/parse-receipt", { image: base64Image });
      return data;
    },
    onSuccess: (data) => {
      setParsedData(data);
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to parse receipt. Please try again.");
      console.error(error);
    },
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (receiptData: any) => {
      const { data } = await api.post("/receipts", receiptData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      Alert.alert("Success", "Receipt saved successfully!");
      reset();
      router.push("/(tabs)/receipts");
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to save receipt.");
      console.error(error);
    },
  });

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-center mb-4 text-lg">
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-black px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
        });
        setImage(photo?.base64 || null);
      } catch (error) {
        Alert.alert("Error", "Failed to take picture");
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(result.assets[0].base64);
    }
  };

  const reset = () => {
    setImage(null);
    setParsedData(null);
  };

  const handleParse = () => {
    if (image) {
      parseMutation.mutate(image);
    }
  };

  const handleSave = () => {
    if (parsedData) {
      createReceiptMutation.mutate({
        ...parsedData,
        image: image, // Optional: if you want to save the raw image too, handle it in backend
      });
    }
  };

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  if (image) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 relative">
          <Image
            source={{ uri: `data:image/jpeg;base64,${image}` }}
            className="flex-1 w-full h-full"
            resizeMode="contain"
          />

          <TouchableOpacity
            onPress={reset}
            className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
          >
            <X color="white" size={24} />
          </TouchableOpacity>

          {parsedData ? (
            <View className="absolute bottom-0 w-full bg-white p-6 rounded-t-3xl shadow-lg h-2/3">
               <ScrollView>
              <Text className="text-2xl font-bold mb-4">Confirm Receipt</Text>

              <View className="mb-4">
                <Text className="text-gray-500 text-sm">Restaurant</Text>
                <Text className="text-lg font-semibold">{parsedData.restaurantName}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500 text-sm">Date</Text>
                <Text className="text-lg font-semibold">{new Date(parsedData.datetime).toLocaleDateString()}</Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500 text-sm">Total</Text>
                <Text className="text-lg font-semibold">${parsedData.total?.toFixed(2)}</Text>
              </View>

              <View className="mb-6">
                <Text className="text-gray-500 text-sm mb-2">Items</Text>
                {parsedData.lineItems.map((item: any, index: number) => (
                  <View key={index} className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="flex-1 mr-4">{item.dishName}</Text>
                    <Text className="font-medium">${item.price?.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleSave}
                disabled={createReceiptMutation.isPending}
                className={`flex-row justify-center items-center py-4 rounded-xl mb-8 ${
                  createReceiptMutation.isPending ? "bg-gray-400" : "bg-green-600"
                }`}
              >
                {createReceiptMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Check color="white" size={20} className="mr-2" />
                    <Text className="text-white font-bold text-lg">Save Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            <View className="absolute bottom-10 left-0 right-0 items-center">
              <TouchableOpacity
                onPress={handleParse}
                disabled={parseMutation.isPending}
                className={`bg-black px-8 py-4 rounded-full flex-row items-center ${
                  parseMutation.isPending ? "opacity-70" : ""
                }`}
              >
                {parseMutation.isPending ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : null}
                <Text className="text-white font-bold text-lg">
                  {parseMutation.isPending ? "Analyzing..." : "Analyze Receipt"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
      >
        <SafeAreaView className="flex-1 justify-between p-6">
          <View className="items-end">
            <TouchableOpacity onPress={toggleCameraFacing} className="p-2 bg-black/40 rounded-full">
              <RefreshCcw color="white" size={24} />
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center mb-8">
            <TouchableOpacity
              onPress={pickImage}
              className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
            >
              <ImageIcon color="white" size={24} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={takePicture}
              className="w-20 h-20 rounded-full border-4 border-white items-center justify-center bg-white/20"
            >
              <View className="w-16 h-16 rounded-full bg-white" />
            </TouchableOpacity>

            <View className="w-12" />
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}
