import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

interface VideoNoteRecorderProps {
  visible: boolean;
  onClose: () => void;
  onFinishRecording: (uri: string, duration: number) => void;
}

const MAX_RECORDING_DURATION = 60; // Максимум 60 секунд

export const VideoNoteRecorder: React.FC<VideoNoteRecorderProps> = ({
  visible,
  onClose,
  onFinishRecording,
}) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState<"front" | "back">("front");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (!cameraPermission?.granted) {
      const cam = await requestCameraPermission();
      if (!cam.granted) {
        Alert.alert("Дозвіл не надано", "Для запису кружечка потрібен доступ до камери.");
        return;
      }
    }

    if (!micPermission?.granted) {
      const mic = await requestMicPermission();
      if (!mic.granted) {
        Alert.alert("Дозвіл не надано", "Для запису звуку потрібен доступ до мікрофона.");
        return;
      }
    }

    try {
      setIsRecording(true);
      setRecordedSeconds(0);

      // Секундомір
      timerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

      if (cameraRef.current) {
        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_RECORDING_DURATION,
        });

        if (video?.uri) {
          onFinishRecording(video.uri, recordedSeconds || 1);
          onClose();
        }
      }
    } catch (error) {
      console.error("Помилка запису відеокружечка:", error);
      Alert.alert("Помилка", "Не вдалося записати відео.");
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      cameraRef.current?.stopRecording();
    } catch (err) {
      console.error("Помилка зупинки запису:", err);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    onClose();
  };

  const toggleFacing = () => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  };

  // Розрахунок геометрії для червоної шкали під час запису
  const circleSize = 270;
  const strokeWidth = 5;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = recordedSeconds / MAX_RECORDING_DURATION;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View className="flex-1 bg-black/90 items-center justify-center p-4">
        {/* Верхній блок з таймером та кнопкою закриття */}
        <View className="absolute top-12 left-6 right-6 flex-row items-center justify-between z-10">
          <View className="flex-row items-center gap-2 bg-surface/80 px-3.5 py-1.5 rounded-full border border-surfaceLight">
            {isRecording ? (
              <View
                key="video-rec-active"
                className="w-3 h-3 rounded-full bg-red-500"
              />
            ) : (
              <View
                key="video-rec-idle"
                className="w-3 h-3 rounded-full bg-grey"
              />
            )}
            <Text className="text-white font-medium text-sm">
              {recordedSeconds < 10 ? `0:0${recordedSeconds}` : `0:${recordedSeconds}`} / 1:00
            </Text>
          </View>

          <TouchableOpacity onPress={handleCancel} className="p-2 active:opacity-70">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Круглий видошукач камери з круговою шкалою */}
        <View style={{ width: circleSize, height: circleSize }} className="relative items-center justify-center">
          <Svg
            width={circleSize}
            height={circleSize}
            style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
          >
            <Circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {isRecording && (
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="#EF4444"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          {/* Вікно камери з круглою обрізкою */}
          <View
            style={{
              width: circleSize - 16,
              height: circleSize - 16,
              borderRadius: (circleSize - 16) / 2,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
            }}
            className="bg-black"
          >
            <CameraView
              ref={cameraRef}
              style={{
                width: circleSize - 16,
                height: ((circleSize - 16) * 16) / 9,
              }}
              facing={facing}
              mode="video"
            />
          </View>
        </View>

        {/* Нижня панель дій */}
        <View className="absolute bottom-12 flex-row items-center gap-8 z-10">
          {/* Перемикач камери */}
          <TouchableOpacity
            onPress={toggleFacing}
            disabled={isRecording}
            className={`w-12 h-12 rounded-full bg-surfaceLight items-center justify-center ${
              isRecording ? "opacity-30" : "active:opacity-80"
            }`}
          >
            <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Кнопка Запис / Стоп */}
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.8}
            className={`w-20 h-20 rounded-full items-center justify-center border-4 border-white ${
              isRecording ? "bg-red-600" : "bg-red-500"
            }`}
          >
            {isRecording ? (
              <View className="w-8 h-8 rounded-md bg-white" />
            ) : (
              <View className="w-14 h-14 rounded-full bg-red-500" />
            )}
          </TouchableOpacity>

          {/* Скасувати */}
          <TouchableOpacity
            onPress={handleCancel}
            className="w-12 h-12 rounded-full bg-surfaceLight items-center justify-center active:opacity-80"
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};