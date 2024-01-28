import React from "react";
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {PaperProvider, TextInput, Button} from 'react-native-paper';

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
    const usersData = require('./users.json');
    const users = usersData.users;
    const handleLogin = (inputEmail, inputPassword) => {
        const user = users.find(u => u.email === inputEmail && u.password === inputPassword);
      
        if (user) {
          // Successful login
          navigation.navigate('StudentCheck')
        } else {
          // Invalid credentials
          console.log('Invalid credentials');
        }
      };
      
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
              secureTextEntry={true}
            />
            <Button mode="contained" style={styles.button} onPress={() => handleLogin(email, password)}>
              LOG IN
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
    backgroundColor: "white",
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
  input: {
    width: '80%',
    outline: 'black',
  },
    button: {
        width: 200,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 30,
    },
});