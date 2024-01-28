import React, {useEffect, useState} from 'react';
import {Button} from 'react-native-paper';
import {Buffer} from '@craftzdog/react-native-buffer';

import {
  View,
  Text,
  StyleSheet,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
} from 'react-native';

import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from 'react-native-ble-manager';
import axios from 'axios';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

declare module 'react-native-ble-manager' {
  // enrich local contract with custom state properties needed by App.tsx
  interface Peripheral {
    connected?: boolean;
    connecting?: boolean;
  }
}

const SECONDS_TO_SCAN_FOR = 3;
const SERVICE_UUIDS: string[] = ['67136e01-58db-f39b-3446-fdde58c0813a'];
const ALLOW_DUPLICATES = false;
const CHARACTERISTIC_UUID: string = '4605cd12-57db-4127-b286-f09bacacfb0f';

interface SessionProfessorData {
  professorId: string;
  subjectId: string;
  startTime: string;
  endTime: string;
}

export default function StudentCheckMe() {
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral['id'], Peripheral>(),
  );
  const [esp32ID, setEsp32ID] = useState('');
  const [hashFromServer, setHashFromServer] = useState('');
  const [professorSessionData, setProfessorSessionData] =
    useState<SessionProfessorData>({
      professorId: '',
      subjectId: '',
      startTime: '',
      endTime: '',
    });

  const startScan = () => {
    if (!isScanning) {
      setProfessorSessionData({
        professorId: '123',
        subjectId: '456',
        startTime: '2024-01-28T10:00:00',
        endTime: '2024-01-28T12:00:00',
      });
      // reset found peripherals before scan
      setPeripherals(new Map<Peripheral['id'], Peripheral>());

      try {
        console.debug('[startScan] starting scan...');
        setIsScanning(true);
        BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
        })
          .then(() => {
            console.debug('[startScan] scan promise returned successfully.');
          })
          .catch((err: any) => {
            console.error('[startScan] ble scan returned in error', err);
          });
      } catch (error) {
        console.error('[startScan] ble scan error thrown', error);
      }
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    console.debug('[handleStopScan] scan is stopped.');
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
    if (
      data.service === SERVICE_UUIDS[0] &&
      data.characteristic === CHARACTERISTIC_UUID
    ) {
      const esp32IDresponse: number[] = data.value;
      const esp32IDString = Buffer.from(esp32IDresponse).toString('utf-8');
      setEsp32ID(esp32IDString);
      //sendSessionDataToBackend(esp32ID, professorSessionData);
    }
  };

  const sendSessionDataToBackend = async (
    esp32ID: string,
    sessionData: SessionProfessorData,
  ) => {
    try {
      // Example of the data you want to send
      const requestData = {
        esp32ID: esp32ID,
        professorId: sessionData.professorId,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        subjectId: sessionData.subjectId,
      };

      // Make an Axios POST request to your backend
      const response = await axios.post('backendEndpoint', requestData);

      // Handle the response from the backend if needed
      console.log('Backend response:', response.data);
    } catch (error) {
      console.error('Error sending data to backend:', error);
    }
  };

  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    console.debug('[handleDiscoverPeripheral] new BLE peripheral=', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    setPeripherals(map => {
      return new Map(map.set(peripheral.id, peripheral));
    });
  };

  const retrieveConnected = async () => {
    try {
      const connectedPeripherals = await BleManager.getConnectedPeripherals();
      if (connectedPeripherals.length === 0) {
        console.warn('[retrieveConnected] No connected peripherals found.');
        return;
      }

      console.debug(
        '[retrieveConnected] connectedPeripherals',
        connectedPeripherals,
      );

      // Create a new Map instance with connected peripherals
      const updatedPeripheralsMap = new Map(
        connectedPeripherals.map(peripheral => [peripheral.id, peripheral]),
      );

      setPeripherals(updatedPeripheralsMap);
    } catch (error) {
      console.error(
        '[retrieveConnected] unable to retrieve connected peripherals.',
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

        const rssi = await BleManager.readRSSI(peripheral.id);
        console.debug(
          `[connectPeripheral][${peripheral.id}] retrieved current RSSI value: ${rssi}.`,
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

        setPeripherals(map => {
          let p = map.get(peripheral.id);
          if (p) {
            p.rssi = rssi;
            return new Map(map.set(p.id, p));
          }
          return map;
        });
      }
    } catch (error) {
      console.error(
        `[connectPeripheral][${peripheral.id}] connectPeripheral error`,
        error,
      );
    }
  };

  function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }

  useEffect(() => {
    try {
      BleManager.start({showAlert: true})
        .then(() => console.debug('BleManager started.'))
        .catch((error: any) =>
          console.error('BeManager could not be started.', error),
        );
    } catch (error) {
      console.error('unexpected error starting BleManager.', error);
      return;
    }
    const listeners = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral,
      ),
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan),
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        handleDisconnectedPeripheral,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      ),
      bleManagerEmitter.addListener(
        'BleManagerConnectPeripheral',
        handleConnectPeripheral,
      ),
    ];
    handleAndroidPermissions();
    return () => {
      console.debug('[app] main component unmounting. Removing listeners...');
      for (const listener of listeners) {
        listener.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAndroidPermissions = () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]).then(result => {
        if (result) {
          console.debug(
            '[handleAndroidPermissions] User accepts runtime permissions android 12+',
          );
        } else {
          console.error(
            '[handleAndroidPermissions] User refuses runtime permissions android 12+',
          );
        }
      });
    } else if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(checkResult => {
        if (checkResult) {
          console.debug(
            '[handleAndroidPermissions] runtime permission Android <12 already OK',
          );
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(requestResult => {
            if (requestResult) {
              console.debug(
                '[handleAndroidPermissions] User accepts runtime permission android <12',
              );
            } else {
              console.error(
                '[handleAndroidPermissions] User refuses runtime permission android <12',
              );
            }
          });
        }
      });
    }
  };

  const convertSessionProfessorData = (): number[] => {
    const data = professorSessionData;

    // Convert string values to UTF-8 encoded byte arrays
    const professorIdBytes = Buffer.from(data.professorId, 'utf-8');
    const subjectIdBytes = Buffer.from(data.subjectId, 'utf-8');
    const startTimeBytes = Buffer.from(data.startTime, 'utf-8');
    const endTimeBytes = Buffer.from(data.endTime, 'utf-8');

    // Concatenate all byte arrays
    const byteArray = [
      ...Array.from(professorIdBytes),
      ...Array.from(subjectIdBytes),
      ...Array.from(startTimeBytes),
      ...Array.from(endTimeBytes),
    ];

    return byteArray;
  };

  const sendSessionProfessorData = async (peripheralId: string) => {
    try {
      retrieveConnected(); // used so the peripheral state only has connected periblerals

      const serviceUUID = SERVICE_UUIDS[0]; // Replace with your actual service UUID
      const characteristicUUID: string = CHARACTERISTIC_UUID; // Replace with your actual characteristic UUID

      const encodedData: number[] = convertSessionProfessorData(); // Implement a function to encode your data

      await BleManager.writeWithoutResponse(
        peripheralId,
        serviceUUID,
        characteristicUUID,
        encodedData,
      );

      console.log(
        `Writing data to peripheral ${peripheralId} - Service UUID: ${serviceUUID} - Characteristic UUID: ${characteristicUUID} - Encoded Data: ${encodedData}`,
      );
      console.debug('Data sent successfully.');
    } catch (error) {
      console.error('Error sending data:', error);
    }
  };

  const startExchangeProcess = async (peripheral: Peripheral) => {
    await connectPeripheral(peripheral);
    sendSessionProfessorData(peripheral.id);
  };

  const renderItem = ({item}: {item: Peripheral}) => {
    const backgroundColor = item.connected ? '#069400' : '#fffff';
    return (
      <TouchableHighlight
        underlayColor="#0082FC"
        onPress={() => startExchangeProcess(item)}>
        <View style={[styles.row, {backgroundColor}]}>
          <Text style={styles.peripheralName}>
            {/* completeLocalName (item.name) & shortAdvertisingName (advertising.localName) may not always be the same */}
            {item.name} - {item?.advertising?.localName}
            {item.connecting && ' - Connecting...'}
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
        {isScanning ? 'Scanning...' : 'Scan Bluetooth'}
      </Button>
      {Array.from(peripherals.values()).length === 0 && (
        <View style={styles.row}>
          <Text style={styles.noPeripherals}>
            No Peripherals, press "Scan Bluetooth" above.
          </Text>
        </View>
      )}

      <FlatList
        data={Array.from(peripherals.values())}
        contentContainerStyle={{rowGap: 12}}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CBF8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    margin: 10,
  },
  peripheralName: {
    fontSize: 16,
    textAlign: 'center',
    padding: 10,
  },
  rssi: {
    fontSize: 12,
    textAlign: 'center',
    padding: 2,
  },
  peripheralId: {
    fontSize: 12,
    textAlign: 'center',
    padding: 2,
    paddingBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  row: {
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 20,
  },
  noPeripherals: {
    margin: 10,
    textAlign: 'center',
  },
});
