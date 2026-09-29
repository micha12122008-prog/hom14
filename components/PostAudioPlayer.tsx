import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";

interface PostAudioPlayerProps {
  audioUrl: string;
  duration?: number;
}

export const PostAudioPlayer: React.FC<PostAudioPlayerProps> = ({
  audioUrl,
  duration,
}) => {
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);

  const togglePlayPause = () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const effectiveDuration = status.duration > 0 ? status.duration : duration ?? 0;
  const progress = effectiveDuration > 0 ? (status.currentTime / effectiveDuration) : 0;

  return (
    <View className="mx-3 my-2 p-2.5 rounded-2xl bg-surface/90 border border-surfaceLight flex-row items-center gap-3">
      {/* Кнопка Play / Pause */}
      <TouchableOpacity
        onPress={togglePlayPause}
        className="w-10 h-10 rounded-full bg-primary items-center justify-center active:opacity-80"
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={20}
          color="#FFFFFF"
          style={{ marginLeft: status.playing ? 0 : 2 }}
        />
      </TouchableOpacity>

      {/* Індикатор прогресу та час */}
      <View className="flex-1 justify-center">
        <View className="h-1.5 bg-surfaceLight rounded-full overflow-hidden mb-1.5">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-grey text-xs">
            {formatTime(status.currentTime || 0)}
          </Text>
          <Text className="text-grey text-xs">
            {formatTime(effectiveDuration)}
          </Text>
        </View>
      </View>

      {/* Іконка мікрофона/аудіо */}
      <View className="pr-1">
        <Ionicons name="mic" size={16} color={COLORS.primary} />
      </View>
    </View>
  );
};