import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const MessageBubble = ({ text, isUser, children }) => (
  <Animated.View
    style={[
      styles.messageContainer,
      isUser ? styles.userMessageContainer : styles.botMessageContainer,
    ]}
  >
    {text && (
      <Text style={isUser ? styles.userMessageText : styles.botMessageText}>
        {text}
      </Text>
    )}
    {children}
  </Animated.View>
);

export default function ChatWithImage() {
  const [imageOne, setImageOne] = useState(null);
  const [imageTwo, setImageTwo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const scrollViewRef = useRef();

  const handleReset = () => {
    setImageOne(null);
    setImageTwo(null);
    setResult(null);
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission",
        "The app needs camera access to take photos.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Library Permission",
        "The app needs access to your photo library to select images.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const takePhoto = async (setImage) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = `photo_${Date.now()}.jpg`;
      const type = "image/jpeg";

      setImage({ uri, name: filename, type });
      setResult(null);
    }
  };

  const pickImage = async (setImage) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const filename = uri.split("/").pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      setImage({ uri, name: filename, type });
      setResult(null);
    }
  };

  const showImageOptions = (setImage, imageNumber) => {
    Alert.alert(
      `Select Image ${imageNumber}`,
      "Would you like to take a new photo or choose from the gallery?",
      [
        {
          text: "📷 Take Photo",
          onPress: () => takePhoto(setImage),
        },
        {
          text: "🖼️ Choose from Gallery",
          onPress: () => pickImage(setImage),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!imageOne || !imageTwo) {
      Alert.alert("Error", "Please select both images.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("img1", {
      uri: imageOne.uri,
      name: imageOne.name,
      type: imageOne.type,
    });
    formData.append("img2", {
      uri: imageTwo.uri,
      name: imageTwo.name,
      type: imageTwo.type,
    });

    try {
      const response = await fetch("https://fs-api.microbox.tech/compare", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const text = await response.text();

      // Check if response is empty
      if (!text || text.trim() === "") {
        throw new Error("Empty response from server");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Response text:", text);

        // Check for specific error types
        if (text.includes("413 Request Entity Too Large")) {
          throw new Error(
            "Image files are too large. Please try with smaller images."
          );
        } else if (text.includes("413")) {
          throw new Error("Request too large. Please try with smaller images.");
        } else if (
          text.includes("500") ||
          text.includes("502") ||
          text.includes("503")
        ) {
          throw new Error(
            "Server is temporarily unavailable. Please try again later."
          );
        } else {
          throw new Error("Invalid response format from server");
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      console.error("API Error:", err);
      Alert.alert(
        "Error",
        err.message || "An error occurred while processing the request."
      );
    } finally {
      setIsLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const renderResult = () => (
    <View style={styles.resultInnerContainer}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>Comparison Result</Text>
        <View style={styles.resultIconContainer}>
          {result.verified ? (
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
          ) : (
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>✗</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.resultContent}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Similarity:</Text>
          <Text style={styles.resultValue}>
            {result.similarity_percentage?.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Distance:</Text>
          <Text style={styles.resultValue}>{result.distance}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Threshold:</Text>
          <Text style={styles.resultValue}>{result.threshold}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Model:</Text>
          <Text style={styles.resultValue}>{result.model}</Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Verification Status</Text>
          <View
            style={[
              styles.statusBadge,
              result.verified ? styles.successBadge : styles.errorBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {result.verified ? "✓ Verified" : "✗ Not Verified"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>🤖 Face Recognition</Text>
            <Text style={styles.headerSubtitle}>Advanced AI Technology</Text>
          </View>
          <View style={styles.headerDecoration}>
            <View style={styles.decorationCircle} />
            <View style={[styles.decorationCircle, styles.decorationCircle2]} />
            <View style={[styles.decorationCircle, styles.decorationCircle3]} />
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      >
        <MessageBubble text="🚀 Welcome! I'll help you compare two faces using advanced AI technology. Let's start with the first image." />

        {imageOne ? (
          <MessageBubble isUser>
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageOne.uri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageLabel}>📸 Image 1</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => showImageOptions(setImageOne, "1")}
            >
              <Text style={styles.changeImageText}>🔄 Change Image</Text>
            </TouchableOpacity>
          </MessageBubble>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => showImageOptions(setImageOne, "1")}
          >
            <View style={styles.buttonGradient}>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>📸</Text>
                <Text style={styles.actionButtonText}>Select First Image</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {imageOne && (
          <>
            <MessageBubble text="🎉 Great! Now select the second image to proceed with the comparison." />
            {imageTwo ? (
              <MessageBubble isUser>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageTwo.uri }} style={styles.image} />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageLabel}>📸 Image 2</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={() => showImageOptions(setImageTwo, "2")}
                >
                  <Text style={styles.changeImageText}>🔄 Change Image</Text>
                </TouchableOpacity>
              </MessageBubble>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => showImageOptions(setImageTwo, "2")}
              >
                <View style={styles.buttonGradient}>
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>📸</Text>
                    <Text style={styles.actionButtonText}>
                      Select Second Image
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {isLoading && (
          <MessageBubble>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>🔍 Analyzing with AI...</Text>
            </View>
          </MessageBubble>
        )}

        {result && <MessageBubble>{renderResult()}</MessageBubble>}
      </ScrollView>

      <View style={styles.bottomBar}>
        {result ? (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <View style={styles.resetButtonGradient}>
              <Text style={styles.resetButtonText}>🔄 New Comparison</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.compareButton,
              (!imageOne || !imageTwo || isLoading) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!imageOne || !imageTwo || isLoading}
          >
            <View style={styles.compareButtonGradient}>
              <Text style={styles.compareButtonText}>🚀 Start Comparison</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  headerGradient: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    padding: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  headerDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorationCircle: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#6366f1",
    opacity: 0.05,
    top: -75,
    right: -75,
  },
  decorationCircle2: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#6366f1",
    opacity: 0.03,
    top: -50,
    right: -25,
  },
  decorationCircle3: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    opacity: 0.04,
    top: -40,
    right: 10,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollViewContent: {
    paddingVertical: 24,
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    maxWidth: "85%",
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    backgroundColor: "#f8fafc",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    backgroundColor: "transparent",
  },
  botMessageText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    fontWeight: "500",
  },
  userMessageText: {
    fontSize: 16,
    color: "#ffffff",
    lineHeight: 24,
    fontWeight: "500",
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
  },
  imageOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  imageLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  changeImageButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    alignSelf: "center",
  },
  changeImageText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    borderRadius: 12,
    marginVertical: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: "#ffffff",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  compareButton: {
    borderRadius: 12,
  },
  compareButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#1e1e1e",
  },
  compareButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    borderRadius: 12,
  },
  resetButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#6b7280",
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
    marginTop: 8,
  },
  resultInnerContainer: {
    padding: 20,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  resultIconContainer: {
    marginTop: 8,
  },
  successIcon: {
    backgroundColor: "#10b981",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  errorIcon: {
    backgroundColor: "#ef4444",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIconText: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  resultContent: {
    gap: 12,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  resultLabel: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
    flex: 1,
  },
  resultValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  statusCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  statusCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  successBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "#10b981",
    borderWidth: 1,
  },
  errorBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#ef4444",
    borderWidth: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  techInfoContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
  },
  techInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  techLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  techValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
});
