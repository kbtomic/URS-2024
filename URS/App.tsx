import React from 'react';
import type {PropsWithChildren} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {PaperProvider, Button, TextInput} from 'react-native-paper';

import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

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

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const backgroundStyle = {
    backgroundColor: '#CBF8FA',
  };

  return (
    <SafeAreaProvider style={backgroundStyle}>
      <PaperProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />

        <Text style={styles.header}>Title</Text>
        <ScrollView>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              label="Email"
              mode="outlined"
              value={email}
              onChangeText={text => setEmail(text)}
            />
            <TextInput
              style={styles.input}
              label="Password"
              mode="outlined"
              value={password}
              onChangeText={text => setPassword(text)}
            />
            <Button
              style={styles.button}
              labelStyle={styles.buttonText}
              mode="contained"
              onPress={() => console.log('Pressed')}>
              Log In
            </Button>
          </View>
        </ScrollView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  header: {
    fontSize: 80,
    padding: 50,
    alignSelf: 'center',
    fontWeight: '600',
  },
  button: {
    width: '80%',
    padding: 5,
  },
  input: {
    width: '80%',
  },
  buttonText: {
    fontSize: 18,
  },
});

export default App;
