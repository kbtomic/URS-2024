import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import DatePicker from 'react-native-date-picker'
import DropDown from "react-native-paper-dropdown";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, TextInput, Button } from 'react-native-paper';

const ScheduleScreen = () => {
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

  const handleCreateSchedule = () => {
    // Implement the logic to save the schedule to your database or perform other actions.
    console.log('Schedule created:', {
      subject,
      date,
      startTime,
      endTime,
      classroom,
    });
  };

  return (
    <SafeAreaProvider>
    <PaperProvider>
      <ScrollView style={styles.container}>
      <View>
        <Text style={styles.header}>Create Class Schedule</Text>

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

        <TextInput
          label="Classroom number"
          placeholder="Enter classroom number"
          value={classroom}
          onChangeText={(text) => setClassroom(text)}
          style={{ marginTop: 30 }}
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
        <Button mode="contained" style={styles.createButton} onPress={handleCreateSchedule}>
            Create lecture
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
});

export default ScheduleScreen;