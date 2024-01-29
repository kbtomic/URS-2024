import React, {useContext, useEffect, useState} from 'react';
import {AuthContext} from '../context/AuthContext';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider, TextInput, Button} from 'react-native-paper';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

export default function Login({navigation}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const {login} = useContext(AuthContext);

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
              <Button
                mode="contained"
                style={styles.button}
                onPress={() => {
                  login(email, password, navigation);
                }}>
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
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
});
