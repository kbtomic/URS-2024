import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import DatePicker from 'react-native-date-picker'
import DropDown from "react-native-paper-dropdown";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, TextInput, Button } from 'react-native-paper';

const ScheduleScreen = ({navigation}) => {
  const { userInfo, logout } = useContext(AuthContext);

  const [subject, setSubject] = useState('');
  const [showDropDown, setShowDropDown] = useState(false);
  const [open, setOpen] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [date, setDate] = useState(new Date());
  const [date2, setDate2] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [classroom, setClassroom] = useState('');

  const subjectList = [
    {
      label: "ADR",
      value: "adr",
    },
    {
      label: "URS",
      value: "urs",
    },
    {
      label: "OS",
      value: "os",
    },
  ];

  const isButtonVisible = subject && startTime && endTime;

  const handleCreateSchedule = () => {
    // Implement the logic to save the schedule to your database or perform other actions.
    if (endTime <= startTime) {
      // Alert user and prevent creating schedule
      alert('End time must be later than start time');
      return;
    }
    
    console.log('Schedule created:', {
      subject,
      date,
      startTime,
      endTime,
    });
  };

  return (
    <SafeAreaProvider>
    <PaperProvider>
      <ScrollView style={styles.container}>
      <View>
        <Text style={styles.header}>Hello, {userInfo.user.name}</Text>

        <DropDown
                label={"Select subject"}
                mode={"outlined"}
                visible={showDropDown}
                showDropDown={() => setShowDropDown(true)}
                onDismiss={() => setShowDropDown(false)}
                value={subject}
                setValue={setSubject}
                list={subjectList}
        />

        <View style={{ marginTop: 30}} >
            <Button mode="contained" onPress={() => setOpen(true)}>
              Choose lecture start time
            </Button>
            <DatePicker
              modal
              open={open}
              date={date}
              onConfirm={(date) => {
                setOpen(false)
                setStartTime(date)
              }}
              onCancel={() => {
                setOpen(false)
              }}
            />
        
            <TextInput
              label="Start time"
              placeholder="Select start time"
              value={`${startTime.toDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              editable={false}
            />
        </View>

        <View style={{ marginTop: 30}} >
            <Button mode="contained" onPress={() => setOpen2(true)}>
              Choose lecture end time
            </Button>
            <DatePicker
              modal
              open={open2}
              date={date2}
              onConfirm={(date2) => {
                setOpen2(false)
                setEndTime(date2)
              }}
              onCancel={() => {
                setOpen2(false)
              }}
            />

            <TextInput
              label="End time"
              placeholder="Select end time"
              value={`${endTime.toDateString()} ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              editable={false}
            />
        </View>

        {isButtonVisible ? <Button mode="contained" style={styles.createButton} onPress={handleCreateSchedule}>
            Create lecture
        </Button> : null}
        

        <Button
              style={styles.logoutButton}
              labelStyle={styles.buttonText}
              mode="contained"
              onPress={() => {logout(navigation)} }
              >
              LOGOUT
            </Button>

      </View>
      </ScrollView>
    </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  createButton: {
    marginTop: 30,
    marginBottom: 30,
    backgroundColor: 'green',
  },
  logoutButton: {
    marginTop: 30,
    marginBottom: 30,
    backgroundColor: 'red',
  },
});

export default ScheduleScreen;