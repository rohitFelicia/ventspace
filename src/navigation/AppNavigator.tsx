import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../context/UserContext';
import { COLORS } from '../constants/theme';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import TopicSelectScreen from '../screens/TopicSelectScreen';
import MatchingScreen from '../screens/MatchingScreen';
import ChatScreen from '../screens/ChatScreen';
import RoomsListScreen from '../screens/RoomsListScreen';
import RoomChatScreen from '../screens/RoomChatScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  TopicSelect: undefined;
  Matching: { topicKey: string; topicLabel: string; topicColor: string };
  Chat: { sessionId: string; topicLabel: string; topicColor: string };
  RoomsList: undefined;
  RoomChat: { topicKey: string; topicLabel: string; topicColor: string; roomId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryLight }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="TopicSelect" component={TopicSelectScreen} />
            <Stack.Screen name="Matching" component={MatchingScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="RoomsList" component={RoomsListScreen} />
            <Stack.Screen name="RoomChat" component={RoomChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
