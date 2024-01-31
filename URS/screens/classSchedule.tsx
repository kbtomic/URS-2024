import React, {useState, useContext, useEffect} from "react";
import {AuthContext} from "../context/AuthContext";
import {Buffer} from "@craftzdog/react-native-buffer";
import DatePicker from "react-native-date-picker";
import DropDown from "react-native-paper-dropdown";
import {SafeAreaProvider, SafeAreaView} from "react-native-safe-area-context";
import {
  PaperProvider,
  TextInput,
  Button,
  DefaultTheme,
} from "react-native-paper";
import axios from "axios";

import {
  SECONDS_TO_SCAN_FOR,
  ALLOW_DUPLICATES,
  SERVICE_UUIDS,
  PROFESSOR_CHARADCTERISTIC_UUID,
  STUDENT_CHARADCTERISTIC_UUID,
  ADVERTISING_NAMES,
  API_URL,
} from "../bleConfig.js";

import {formatDateTime, sleep} from "../helpers.ts";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeModules,
  NativeEventEmitter,
  Alert,
  FlatList,
  TouchableHighlight,
  Platform,
  PermissionsAndroid,
} from "react-native";

import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from "react-native-ble-manager";
import {white} from "react-native-paper/lib/typescript/styles/themes/v2/colors";

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

declare module "react-native-ble-manager" {
  // enrich local contract with custom state properties needed by App.tsx
  interface Peripheral {
    connected?: boolean;
    connecting?: boolean;
  }
}

interface SessionData {
  name: string;
  start_date: string;
}

interface LectureData {
  id: number;
  name: string;
  start_date: string;
  end_date: null | string;
  user_id: number;
  class_id: string;
  createdAt: string;
  updatedAt: string;
  salt: string;
}

const ScheduleScreen = ({navigation}: {navigation: any}) => {
  const {userInfo, logout} = useContext(AuthContext);

  const [subject, setSubject] = useState("");
  const [showDropDown, setShowDropDown] = useState(false);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());

  /*BLE states */
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral["id"], Peripheral>(),
  );
  const [classId, setClassId] = useState("");

  const [sessionData, setSessionData] = useState<SessionData>({
    name: "",
    start_date: "",
  });

  const [lectureData, setLectureData] = useState<LectureData>({
    id: -1,
    name: "",
    start_date: "",
    end_date: null,
    user_id: 0,
    class_id: "",
    createdAt: "",
    updatedAt: "",
    salt: "",
  });

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

  const isButtonVisible = subject && startTime;

  const startScan = () => {
    setSessionData({
      name: subject,
      start_date: formatDateTime(date),
    });

    if (!isScanning) {
      setPeripherals(new Map<Peripheral["id"], Peripheral>());

      try {
        console.debug("[startScan] starting scan...");
        setIsScanning(true);
        BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
          exactAdvertisingName: ADVERTISING_NAMES, //change name to device if needed
        })
          .then(() => {
            console.debug("[startScan] scan promise returned successfully.");
          })
          .catch((err: any) => {
            console.error("[startScan] ble scan returned in error", err);
          });
      } catch (error) {
        console.error("[startScan] ble scan error thrown", error);
      }
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    console.debug("[handleStopScan] scan is stopped.");
  };

  const handleDisconnectedPeripheral = (
    event: BleDisconnectPeripheralEvent,
  ) => {
    console.debug(
      `[handleDisconnectedPeripheral][${event.peripheral}] disconnected.`,
    );
    setPeripherals(map => {
      let p = map.get(event.peripheral);
      if (p) {
        p.connected = false;
        return new Map(map.set(event.peripheral, p));
      }
      return map;
    });
  };

  const handleConnectPeripheral = (event: any) => {
    console.log(`[handleConnectPeripheral][${event.peripheral}] connected.`);
  };

  const handleUpdateValueForCharacteristic = (
    data: BleManagerDidUpdateValueForCharacteristicEvent,
  ) => {
    console.debug(
      `[handleUpdateValueForCharacteristic] received data from '${data.peripheral}' with characteristic='${data.characteristic}' and value='${data.value}'`,
    );
    // if (
    //   data.service === SERVICE_UUIDS[0] &&
    //   data.characteristic === CHARACTERISTIC_UUID
    // ) {
    //   const esp32response: number[] = data.value;
    //   const esp32classID = Buffer.from(esp32response).toString("utf-8");
    //   setClassId(esp32classID);
    // }
  };

  useEffect(() => {
    if (classId !== "") {
      sendStartSessionDataToBackend();
    }
  }, [classId]);

  useEffect(() => {
    if (lectureData.id !== -1) {
      //send received data to esp
      const byteArray: number[] = convertLectureDataForESP();
      console.log(`Encoded data for ESP:` + JSON.stringify(byteArray, null, 2));
      sendSessionDataToESP(byteArray);
    }
  }, [lectureData]);

  const sendSessionDataToESP = async (dataToSend: number[]) => {
    try {
      retrieveConnected(); // used so the peripheral state only has connected periblerals
      const serviceUUID = SERVICE_UUIDS[0]; // Replace with your actual service UUID
      const characteristicUUID: string = PROFESSOR_CHARADCTERISTIC_UUID; // Replace with your actual characteristic UUID

      const encodedData: number[] = dataToSend; // Implement a function to encode your data
      console.debug(`Encoded data for ESP: ${encodedData}`);

      const firstPeripheral = [...peripherals.values()][0];

      const peripheralData = await BleManager.retrieveServices(
        firstPeripheral.id,
      ); //documentation says to always call before writing

      // console.debug(
      //   `[SendSessionDataToEsp] Peripheral id where you sending data: ${firstPeripheral.id}`,
      // ); ID je tocan to je provjereno

      await BleManager.writeWithoutResponse(
        firstPeripheral.id,
        serviceUUID,
        characteristicUUID,
        encodedData,
      );

      console.log(
        `Writing data to peripheral ${firstPeripheral.id} - Service UUID: ${serviceUUID} - Characteristic UUID: ${characteristicUUID} - Encoded Data: ${encodedData}`,
      );
      console.debug("Data sent successfully.");
    } catch (error) {
      console.error("Error sending data:", error);
    }
  };

  const convertLectureDataForESP = (): number[] => {
    // Convert string values to UTF-8 encoded byte arrays
    const {id, salt} = lectureData;

    // Convert id to Buffer
    const lectureIdBuffer = Buffer.from(id.toString(), "utf-8");

    // Convert salt to Buffer
    const saltBuffer = Buffer.from(salt, "utf-8");

    console.debug(`Buffer of data: ${saltBuffer}`);
    //concatenate all bytes
    const byteArray = [
      ...Array.from(lectureIdBuffer),
      ...Array.from(saltBuffer),
    ];

    return byteArray;
  };

  const sendStartSessionDataToBackend = () => {
    // Example of the data you want to send
    const requestData = {
      name: sessionData.name,
      start_date: sessionData.start_date,
      class_id: classId,
    };

    const headers = {
      "Content-Type": "application/json",
      "x-auth-token": userInfo.token.token,
    };

    const api_url = `${API_URL}/api/v1/lectures/create`;

    // Use Promise for axios
    return axios
      .post(api_url, requestData, {headers: headers})
      .then(response => {
        setLectureData(response.data);
        console.debug(
          "Successful send of data to backend, Backend response:",
          response.data,
        );
        setLectureData(response.data);
        return response.data; // You can return the data if needed
      })
      .then(null, error => {
        // Handle errors and still access the response
        console.error("Error sending data to backend:", error);
        if (error.response) {
          // The request was made and the server responded with a status code
          console.error("Server responded with status:", error.response.status);
          console.error("Response data:", error.response.data);
        } else if (error.request) {
          // The request was made but no response was received
          console.error("No response received from the server");
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error setting up the request:", error.message);
        }
        throw error; // Propagate the error if needed
      });
  };

  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    console.debug("[handleDiscoverPeripheral] new BLE peripheral=", peripheral);
    if (!peripheral.name) {
      peripheral.name = "NO NAME";
    }
    setPeripherals(map => {
      return new Map(map.set(peripheral.id, peripheral));
    });
  };

  const retrieveConnected = async () => {
    try {
      const connectedPeripherals = await BleManager.getConnectedPeripherals();
      if (connectedPeripherals.length === 0) {
        console.warn("[retrieveConnected] No connected peripherals found.");
        return;
      }

      console.debug(
        "[retrieveConnected] connectedPeripherals",
        connectedPeripherals,
      );

      // Create a new Map instance with connected peripherals
      const updatedPeripheralsMap = new Map(
        connectedPeripherals.map(peripheral => [peripheral.id, peripheral]),
      );

      setPeripherals(updatedPeripheralsMap);
    } catch (error) {
      console.error(
        "[retrieveConnected] unable to retrieve connected peripherals.",
        error,
      );
    }
  };

  const connectPeripheral = async (peripheral: Peripheral) => {
    try {
      if (peripheral) {
        setPeripherals(map => {
          let p = map.get(peripheral.id);
          if (p) {
            p.connecting = true;
            return new Map(map.set(p.id, p));
          }
          return map;
        });

        await BleManager.connect(peripheral.id);
        console.debug(`[connectPeripheral][${peripheral.id}] connected.`);

        setPeripherals(map => {
          let p = map.get(peripheral.id);
          if (p) {
            p.connecting = false;
            p.connected = true;
            return new Map(map.set(p.id, p));
          }
          return map;
        });

        // before retrieving services, it is often a good idea to let bonding & connection finish properly
        await sleep(900);

        /* Test read current RSSI value, retrieve services first */
        const peripheralData = await BleManager.retrieveServices(peripheral.id);
        console.debug(
          `[connectPeripheral][${peripheral.id}] retrieved peripheral services`,
          peripheralData,
        );

        //Ako ovi if ne bude radia onda u donjem ifu mozes direktno prominit
        if (peripheralData.characteristics) {
          const desiredCharacteristic = peripheralData.characteristics.find(
            characteristic =>
              characteristic.characteristic === PROFESSOR_CHARADCTERISTIC_UUID,
          );

          if (desiredCharacteristic) {
            // Read the value of the desired characteristic
            const characteristicValue = await BleManager.read(
              peripheral.id,
              desiredCharacteristic.service,
              desiredCharacteristic.characteristic,
            );

            console.debug(
              `[connectPeripheral][${peripheral.id}] Value of characteristic ${desiredCharacteristic.characteristic}:`,
              characteristicValue,
            );

            const esp32classID =
              Buffer.from(characteristicValue).toString("utf-8");
            console.debug(
              `Class id after converting from byte arra: ${esp32classID}`,
            );
            //setClassId(esp32classID); UNCOMMENT WHEN TESTING WITH ESP, AND DELETE SETID BELOW
          }
        }

        if (peripheralData.characteristics) {
          for (let characteristic of peripheralData.characteristics) {
            if (characteristic.descriptors) {
              for (let descriptor of characteristic.descriptors) {
                try {
                  let data = await BleManager.readDescriptor(
                    peripheral.id,
                    characteristic.service,
                    characteristic.characteristic,
                    descriptor.uuid,
                  );
                  console.debug(
                    `[connectPeripheral][${peripheral.id}] ${characteristic.service} ${characteristic.characteristic} ${descriptor.uuid} descriptor read as:`,
                    data,
                  );
                } catch (error) {
                  console.error(
                    `[connectPeripheral][${peripheral.id}] failed to retrieve descriptor ${descriptor} for characteristic ${characteristic}:`,
                    error,
                  );
                }
              }
            }
          }
        }

        setClassId("e3617a9f-8bab-4714-8c27-c4e9e9555d10"); //REMOVE THIS LATER
      }
    } catch (error) {
      console.error(
        `[connectPeripheral][${peripheral.id}] connectPeripheral error`,
        error,
      );
    }
  };

  /*BLE setup iz in use effect */
  useEffect(() => {
    try {
      BleManager.start({showAlert: true})
        .then(() => console.debug("BleManager started."))
        .catch((error: any) =>
          console.error("BeManager could not be started.", error),
        );
    } catch (error) {
      console.error("unexpected error starting BleManager.", error);
      return;
    }
    const listeners = [
      bleManagerEmitter.addListener(
        "BleManagerDiscoverPeripheral",
        handleDiscoverPeripheral,
      ),
      bleManagerEmitter.addListener("BleManagerStopScan", handleStopScan),
      bleManagerEmitter.addListener(
        "BleManagerDisconnectPeripheral",
        handleDisconnectedPeripheral,
      ),
      bleManagerEmitter.addListener(
        "BleManagerDidUpdateValueForCharacteristic",
        handleUpdateValueForCharacteristic,
      ),
      bleManagerEmitter.addListener(
        "BleManagerConnectPeripheral",
        handleConnectPeripheral,
      ),
    ];
    handleAndroidPermissions();
    return () => {
      console.debug("[app] main component unmounting. Removing listeners...");
      for (const listener of listeners) {
        listener.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAndroidPermissions = () => {
    if (Platform.OS === "android" && Platform.Version >= 31) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]).then(result => {
        if (result) {
          console.debug(
            "[handleAndroidPermissions] User accepts runtime permissions android 12+",
          );
        } else {
          console.error(
            "[handleAndroidPermissions] User refuses runtime permissions android 12+",
          );
        }
      });
    } else if (Platform.OS === "android" && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(checkResult => {
        if (checkResult) {
          console.debug(
            "[handleAndroidPermissions] runtime permission Android <12 already OK",
          );
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(requestResult => {
            if (requestResult) {
              console.debug(
                "[handleAndroidPermissions] User accepts runtime permission android <12",
              );
            } else {
              console.error(
                "[handleAndroidPermissions] User refuses runtime permission android <12",
              );
            }
          });
        }
      });
    }
  };

  const renderItem = ({item}: {item: Peripheral}) => {
    const borderColor = item.connected ? "#7ac3fa" : "#fffff";
    return (
      <TouchableHighlight
        style={styles.highlight}
        underlayColor="#b8dffc"
        onPress={() => connectPeripheral(item)}>
        <View style={[styles.row, {borderColor}]}>
          <Text style={styles.peripheralName}>
            {/* {item.name} - {item?.advertising?.localName} */}
            {item.name}
          </Text>
          <Text style={styles.peripheralName}>
            {!item.connected && !item.connecting && "Tap to start lecture"}
            {item.connecting && "Starting lecture..."}
            {item.connected && "Lecture started"}
          </Text>
        </View>
      </TouchableHighlight>
    );
  };

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: "white", // Change this to your desired color
    },
  };

  const theme2 = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: "black", // Change this to your desired color
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ScrollView style={styles.container}>
          <View style={styles.mainContainer}>
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
              theme={theme}
            />

            <View style={{marginTop: 30}}>
              <Button
                style={styles.chooseLecture}
                mode="contained"
                labelStyle={styles.buttonText}
                onPress={() => setOpen(true)}>
                Choose lecture start time
              </Button>
              <DatePicker
                modal
                open={open}
                date={date}
                onConfirm={date => {
                  setOpen(false);
                  setStartTime(date);
                }}
                onCancel={() => {
                  setOpen(false);
                }}
              />

              <TextInput
                style={styles.textInput}
                theme={theme2}
                label="Start time"
                placeholder="Select start time"
                value={`${startTime.toDateString()} ${startTime.toLocaleTimeString(
                  [],
                  {hour: "2-digit", minute: "2-digit"},
                )}`}
                editable={false}
              />
            </View>

            {isButtonVisible ? (
              <View style={styles.bleContainer}>
                <Button
                  mode="contained"
                  style={styles.createButton}
                  onPress={startScan}
                  labelStyle={styles.buttonText}>
                  Scan for nearby classrooms!
                </Button>
                <FlatList
                  data={Array.from(peripherals.values())}
                  contentContainerStyle={{rowGap: 12}}
                  renderItem={renderItem}
                  keyExtractor={item => item.id}
                />
              </View>
            ) : null}
          </View>
          <Button
            style={styles.logoutButton}
            labelStyle={styles.buttonText}
            mode="contained"
            onPress={() => {
              logout(navigation);
            }}>
            LOGOUT
          </Button>
        </ScrollView>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  bleContainer: {
    minHeight: 310,
  },
  mainContainer: {
    paddingTop: 50,
  },
  textInput: {
    backgroundColor: "white",
  },
  chooseLecture: {
    borderRadius: 10,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    color: "#6854a4",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "white",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 30,
  },
  createButton: {
    marginTop: 30,
    marginBottom: 30,
    paddingVertical: 5,
    backgroundColor: "#7ac3fa",
    borderRadius: 15,
  },

  logoutButton: {
    width: "100%",
    marginTop: 100,

    backgroundColor: "#ff5e5e",
    borderRadius: 15,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
  },

  peripheralName: {
    fontSize: 18,
    textAlign: "center",
    padding: 10,
  },
  rssi: {
    fontSize: 12,
    textAlign: "center",
    padding: 2,
  },
  peripheralId: {
    fontSize: 12,
    textAlign: "center",
    padding: 2,
    paddingBottom: 20,
  },
  row: {
    borderWidth: 3,
    marginLeft: 30,
    marginRight: 30,
    borderRadius: 10,
  },
  highlight: {
    marginLeft: 40,
    marginRight: 40,
    borderRadius: 10,
  },
  noPeripherals: {
    margin: 10,
    textAlign: "center",
  },
});

export default ScheduleScreen;
