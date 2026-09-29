import { View, Text, Image, TouchableOpacity } from "react-native";

type StoryUser = {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
  isCurrentUser?: boolean;
};

interface StoryProps {
  story: StoryUser;
  onPress: () => void;
}

export default function Story({ story, onPress }: StoryProps) {
  return (
    <TouchableOpacity
      className="items-center mx-2 w-[72px]"
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Кільце історії */}
      <View
        className={`w-[68px] h-[68px] rounded-full p-0.5 mb-1 justify-center items-center bg-black border-2 ${
          story.hasStory ? "border-primary" : "border-surfaceLight"
        }`}
      >
        <Image
          source={{ uri: story.avatar }}
          className="w-[58px] h-[58px] rounded-full border border-black"
        />
      </View>
      <Text className="text-white text-xs text-center" numberOfLines={1}>
        {story.username}
      </Text>
    </TouchableOpacity>
  );
}