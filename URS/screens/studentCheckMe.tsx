import React, {useContext, useEffect, useState} from "react";
import {Button} from "react-native-paper";
import {Buffer} from "@craftzdog/react-native-buffer";
import {AuthContext} from "../context/AuthContext";
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

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

declare module "react-native-ble-manager" {
  // enrich local contract with custom state properties needed by App.tsx
  interface Peripheral {
    connected?: boolean;
    connecting?: boolean;
  }
}

interface ESPSessionData {
  hash: string;
  class_id: string;
  lecture_id: number;
}

export default function StudentCheckMe({navigation}: {navigation: any}) {
  const {userInfo, logout} = useContext(AuthContext);

  /*BLE states */
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral["id"], Peripheral>(),
  );
  const [ESPSessionData, setESPSessionData] = useState<ESPSessionData>(); //default undefined

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

    const firstPeripheral = event.peripheral;
    console.debug(`[First peripheral id]: ${firstPeripheral}`);

    console.debug(
      `Student id being sent after connecting: ${userInfo.user.id}`,
    );

    const studentIdBuffer = Buffer.from(userInfo.user.id.toString(), "utf-8");
    const byteArray = [...Array.from(studentIdBuffer)];

    //Perform a write operation
    BleManager.write(
      firstPeripheral,
      SERVICE_UUIDS[0],
      STUDENT_CHARADCTERISTIC_UUID,
      byteArray,
    )
      .then(responseData => {
        console.log(
          `ESP responded with the following data ` +
            JSON.stringify(responseData, null, 2),
        );
        convertDataFromBytes(responseData);
      })
      .catch(error => {
        console.error("Error during write operation:", error);
      });
  };

  const convertDataFromBytes = (byteArray: any) => {
    const hashBuffer = Buffer.from(byteArray.slice(0, 64));
    const hash = hashBuffer.toString("utf-8");
    // Assuming the next 36 bytes are the classId
    const classIdBuffer = Buffer.from(byteArray.slice(64, 100));
    const classId = classIdBuffer.toString("utf-8");

    // Assuming the last two bytes are the lectureId
    const lectureIdBuffer = Buffer.from(byteArray.slice(100, 102));
    const lectureId = lectureIdBuffer.toString("utf-8");

    setESPSessionData({
      hash: hash,
      class_id: classId,
      lecture_id: Number(lectureId),
    }); //after this useEffect is called
  };

  useEffect(() => {
    if (ESPSessionData !== undefined) {
      console.debug(
        `[Data for server from student]: Hash-${ESPSessionData.hash}, classId-${ESPSessionData.class_id}, lectureId-${ESPSessionData.lecture_id}`,
      );
      sendDataToServer();
    }
  }, [ESPSessionData]);

  const sendDataToServer = () => {
    const requestData = {
      lecture_id: ESPSessionData?.lecture_id,
      hash: ESPSessionData?.hash,
    };

    const headers = {
      "Content-Type": "application/json",
      "x-auth-token": userInfo.token.token,
    };

    const api_url = `${API_URL}/api/v1/attends/attend/${ESPSessionData?.class_id}`;

    // Use Promise for axios
    return axios
      .post(api_url, requestData, {headers: headers})
      .then(response => {
        console.debug(
          "Successful send of data to backend, Backend response:",
          response.data,
        );

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

  const handleUpdateValueForCharacteristic = (
    //Adjust this functions
    data: BleManagerDidUpdateValueForCharacteristicEvent,
  ) => {
    console.debug(
      `[handleUpdateValueForCharacteristic] received data from '${data.peripheral}' with characteristic='${data.characteristic}' and value='${data.value}'`,
    );
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

  const startScan = () => {
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
      }
    } catch (error) {
      console.error(
        `[connectPeripheral][${peripheral.id}] connectPeripheral error`,
        error,
      );
    }
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
  const renderItem = ({item}: {item: Peripheral}) => {
    const backgroundColor = item.connected ? "#069400" : "#fffff";
    return (
      <TouchableHighlight
        underlayColor="#0082FC"
        onPress={() => connectPeripheral(item)}>
        <View style={[styles.row, {backgroundColor}]}>
          <Text style={styles.peripheralName}>
            {/* completeLocalName (item.name) & shortAdvertisingName (advertising.localName) may not always be the same */}
            {item.name} - {item?.advertising?.localName}
            {item.connecting && " - Starting lecture..."}
          </Text>
          <Text style={styles.peripheralId}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <View style={styles.container}>
      <Button
        style={styles.button}
        labelStyle={styles.buttonText}
        onPress={startScan}
        mode="contained">
        Look for nearby classrooms!
      </Button>
      <FlatList
        data={Array.from(peripherals.values())}
        contentContainerStyle={{rowGap: 12}}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
      <Button
        style={styles.logoutButton}
        labelStyle={styles.buttonText}
        mode="contained"
        onPress={() => {
          logout(navigation);
        }}>
        LOGOUT
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#CBF8FA",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 200,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    margin: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
  },
  logoutButton: {
    width: 200,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    margin: 10,
    backgroundColor: "red",
  },

  peripheralName: {
    fontSize: 16,
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
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 20,
  },
  noPeripherals: {
    margin: 10,
    textAlign: "center",
  },
});
