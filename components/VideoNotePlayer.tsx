import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

interface VideoNotePlayerProps {
  videoUrl: string;
  duration?: number;
  size?: number;
}

export const VideoNotePlayer: React.FC<VideoNotePlayerProps> = ({
  videoUrl,
  duration = 0,
  size = 250,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Налаштування автовідтворення по колу
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.timeUpdateEventInterval = 0.1;
    p.play();
  });

  useEffect(() => {
    // Слухаємо оновлення поточного часу відтворення
    const timeSub = player.addListener("timeUpdate", (event) => {
      const effectiveDuration = player.duration > 0 ? player.duration : duration;
      if (effectiveDuration > 0) {
        setProgress(event.currentTime / effectiveDuration);
      }
    });

    const playingSub = player.addListener("playingChange", (event) => {
      setIsPlaying(event.isPlaying);
    });

    return () => {
      timeSub.remove();
      playingSub.remove();
    };
  }, [player, duration]);

  const handleTogglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleToggleMute = () => {
    player.muted = !player.muted;
    setIsMuted(player.muted);
  };

  // Розрахунок геометрії кола
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(Math.max(progress, 0), 1) * circumference;

  const boxSize = size - 12;
  const isAndroid = Platform.OS === "android";

  return (
    <View
      style={{ width: size, height: size }}
      className="relative items-center justify-center my-2"
    >
      {/* Круговий SVG-контур прогресу */}
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        {/* Фонова тонка лінія */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Активний прогрес перегляду */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Кругле вікно відео */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTogglePlay}
        style={{
          width: boxSize,
          height: boxSize,
          borderRadius: boxSize / 2,
          overflow: "hidden",
        }}
        className="bg-black relative items-center justify-center border border-surfaceLight"
      >
        <VideoView
          player={player}
          style={{
            width: boxSize,
            height: boxSize,
          }}
          contentFit="cover"
          surfaceType={isAndroid ? "textureView" : undefined}
          nativeControls={false}
        />

        {/* Іконка Play по центру, якщо відео на паузі */}
        {!isPlaying && (
          <View className="absolute w-12 h-12 rounded-full bg-black/60 items-center justify-center">
            <Ionicons
              name="play"
              size={24}
              color="#FFFFFF"
              style={{ marginLeft: 2 }}
            />
          </View>
        )}

        {/* Бейдж звуку (Mute / Unmute) */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleToggleMute();
          }}
          className="absolute bottom-3 bg-black/70 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-white/10"
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={14}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};