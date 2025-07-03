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
        "Quyền truy cập camera",
        "Ứng dụng cần quyền truy cập camera để chụp ảnh.",
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
        "Quyền truy cập thư viện",
        "Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh.",
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
      quality: 1,
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
      quality: 1,
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
      `Chọn ảnh ${imageNumber}`,
      "Bạn muốn chụp ảnh mới hay chọn từ thư viện?",
      [
        {
          text: "📷 Chụp ảnh",
          onPress: () => takePhoto(setImage),
        },
        {
          text: "🖼️ Chọn từ thư viện",
          onPress: () => pickImage(setImage),
        },
        {
          text: "Hủy",
          style: "cancel",
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!imageOne || !imageTwo) {
      Alert.alert("Lỗi", "Vui lòng chọn đủ 2 ảnh.");
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
      const data = JSON.parse(text);

      if (!response.ok) throw new Error(data.error || "Lỗi từ server");

      setResult(data);
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Đã xảy ra lỗi.");
    } finally {
      setIsLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const renderResult = () => (
    <View style={styles.resultInnerContainer}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>Kết quả so sánh</Text>
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
          <Text style={styles.resultLabel}>Độ tương đồng:</Text>
          <Text style={styles.resultValue}>
            {result.similarity_percentage?.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Trạng thái:</Text>
          <Text
            style={[
              styles.resultValue,
              { color: result.verified ? "#10B981" : "#EF4444" },
            ]}
          >
            {result.verified ? "Xác thực thành công" : "Xác thực thất bại"}
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Khoảng cách:</Text>
          <Text style={styles.resultValue}>{result.distance}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Ngưỡng:</Text>
          <Text style={styles.resultValue}>{result.threshold}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Model:</Text>
          <Text style={styles.resultValue}>{result.model}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>🏝️ Face Recognition</Text>
          <Text style={styles.headerSubtitle}>So sánh khuôn mặt</Text>
          <View style={styles.waveDecoration}>
            <View style={styles.wave} />
            <View style={[styles.wave, styles.wave2]} />
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
        <MessageBubble text="Xin chào! Tôi có thể giúp bạn so sánh 2 khuôn mặt. Vui lòng chọn hoặc chụp ảnh thứ nhất." />

        {imageOne ? (
          <MessageBubble isUser>
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageOne.uri }} style={styles.image} />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageLabel}>Ảnh 1</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={() => showImageOptions(setImageOne, "1")}
            >
              <Text style={styles.changeImageText}>🔄 Đổi ảnh</Text>
            </TouchableOpacity>
          </MessageBubble>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => showImageOptions(setImageOne, "1")}
          >
            <View style={styles.buttonGradient}>
              <View style={styles.buttonContent}>
                <Text style={styles.buttonIcon}>📷</Text>
                <Text style={styles.actionButtonText}>Chọn/Chụp ảnh 1</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {imageOne && (
          <>
            <MessageBubble text="Tuyệt vời! Bây giờ, hãy chọn hoặc chụp ảnh thứ hai." />
            {imageTwo ? (
              <MessageBubble isUser>
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageTwo.uri }} style={styles.image} />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageLabel}>Ảnh 2</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={() => showImageOptions(setImageTwo, "2")}
                >
                  <Text style={styles.changeImageText}>🔄 Đổi ảnh</Text>
                </TouchableOpacity>
              </MessageBubble>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => showImageOptions(setImageTwo, "2")}
              >
                <View style={styles.buttonGradient}>
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>📷</Text>
                    <Text style={styles.actionButtonText}>Chọn/Chụp ảnh 2</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {isLoading && (
          <MessageBubble>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#009CA6" />
              <Text style={styles.loadingText}>Đang phân tích...</Text>
            </View>
          </MessageBubble>
        )}

        {result && <MessageBubble>{renderResult()}</MessageBubble>}
      </ScrollView>

      <View style={styles.bottomBar}>
        {result ? (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <View style={styles.resetButtonGradient}>
              <Text style={styles.resetButtonText}>So sánh khác</Text>
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
              <Text style={styles.compareButtonText}>So sánh</Text>
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
    backgroundColor: "#FDFDFD",
  },
  header: {
    height: 120,
    overflow: "hidden",
  },
  headerGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "#009CA6",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FDFDFD",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#FDFDFD",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
  waveDecoration: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  wave: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: "#FDFDFD",
    borderRadius: 20,
    transform: [{ scaleY: 0.5 }],
  },
  wave2: {
    backgroundColor: "rgba(253, 253, 253, 0.8)",
    transform: [{ scaleY: 0.3 }],
    bottom: 5,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollViewContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageContainer: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    maxWidth: "85%",
    shadowColor: "#009CA6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  botMessageContainer: {
    backgroundColor: "#FDFDFD",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 156, 166, 0.1)",
  },
  userMessageContainer: {
    backgroundColor: "#009CA6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 8,
  },
  botMessageText: {
    fontSize: 16,
    color: "#1E293B",
    lineHeight: 22,
  },
  userMessageText: {
    fontSize: 16,
    color: "#FDFDFD",
    lineHeight: 22,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#009CA6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 16,
  },
  imageOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 156, 166, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  imageLabel: {
    color: "#FDFDFD",
    fontSize: 12,
    fontWeight: "600",
  },
  changeImageButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(253, 253, 253, 0.2)",
    borderRadius: 12,
    alignSelf: "center",
  },
  changeImageText: {
    color: "#FDFDFD",
    fontSize: 12,
    fontWeight: "500",
  },
  actionButton: {
    borderRadius: 28,
    alignSelf: "center",
    marginVertical: 12,
    shadowColor: "#009CA6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: "#009CA6",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionButtonText: {
    color: "#FDFDFD",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomBar: {
    padding: 20,
    backgroundColor: "#FDFDFD",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 156, 166, 0.1)",
    shadowColor: "#009CA6",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compareButton: {
    borderRadius: 32,
    shadowColor: "#009CA6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  compareButtonGradient: {
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: "center",
    backgroundColor: "#009CA6",
  },
  compareButtonText: {
    color: "#FDFDFD",
    fontSize: 18,
    fontWeight: "700",
  },
  resetButton: {
    borderRadius: 32,
    shadowColor: "#F4C95D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  resetButtonGradient: {
    paddingVertical: 18,
    borderRadius: 32,
    alignItems: "center",
    backgroundColor: "#F4C95D",
  },
  resetButtonText: {
    color: "#1E293B",
    fontSize: 18,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#009CA6",
    fontWeight: "600",
  },
  resultInnerContainer: {
    padding: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 156, 166, 0.2)",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#009CA6",
  },
  resultIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    backgroundColor: "#10B981",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconText: {
    color: "#FDFDFD",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorIcon: {
    backgroundColor: "#EF4444",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  errorIconText: {
    color: "#FDFDFD",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultContent: {
    gap: 12,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  resultLabel: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
  resultValue: {
    fontSize: 15,
    color: "#009CA6",
    fontWeight: "600",
  },
});
