import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/login';
import StudentCheckMeScreen from './screens/studentCheckMe';
import ClassScheduleScreen from './screens/classSchedule';
import { AuthProvider } from './context/AuthContext';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  
  return (
    <AuthProvider>
      <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="StudentCheck" component={StudentCheckMeScreen} options={{ headerShown: false }}/>
            <Stack.Screen name="ClassSchedule" component={ClassScheduleScreen} options={{ headerShown: false }}/>
          </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

export default App;

/*
Left this component if needed for example for building our own

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

sectionContainer: {
  marginTop: 32,
  paddingHorizontal: 24,
},
sectionTitle: {
  fontSize: 24,
  fontWeight: '600',
},
sectionDescription: {
  marginTop: 8,
  fontSize: 18,
  fontWeight: '400',
},
*/