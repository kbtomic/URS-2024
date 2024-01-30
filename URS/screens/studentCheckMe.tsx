import React, {useContext, useState} from "react";
import {Button} from "react-native-paper";
import {AuthContext} from "../context/AuthContext";
import axios from "axios";

import {
  SECONDS_TO_SCAN_FOR,
  ALLOW_DUPLICATES,
  SERVICE_UUIDS,
  PROFESSOR_CHARADCTERISTIC_UUID,
  STUDENT_CHARADCTERISTIC_UUID,
  CHARACTERISTIC_UUID,
  ADVERTISING_NAMES,
  API_URL,
} from "../bleConfig.js";
import {formatDateTime} from "../helpers.ts";

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

  return (
    <View style={styles.container}>
      <Button
        style={styles.button}
        labelStyle={styles.buttonText}
        mode="contained">
        Check me!
      </Button>
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
});
