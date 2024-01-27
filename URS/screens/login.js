import React from "react";
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

export default function Login({navigation}) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
  return (
    <View style={styles.container}>
      <SafeAreaProvider>
      <PaperProvider>
        <Text style={styles.header}>User login</Text>
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
              onPress={() => navigation.navigate('StudentCheck')}>
              Log In
            </Button>
          </View>
        </ScrollView>
      </PaperProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#CBF8FA",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  header: {
    fontSize: 50,
    padding: 50,
    alignSelf: 'center',
    fontWeight: '600',
    color: '#6854a4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
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