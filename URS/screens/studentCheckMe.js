import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "react-native-paper";

export default function StudentCheckMe() {
    return (
        <View style={styles.container}>
            <Button
              style={styles.button}
              labelStyle={styles.buttonText}
              mode="contained">
              Check me!
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
});