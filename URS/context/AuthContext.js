import React, {createContext, useState} from "react";

import axios from "axios";
import {API_KEY} from "@env";
const API_URL = "http://162.19.246.36:5000";

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [userInfo, setUserInfo] = useState(null);
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const login = (email, password, navigation) => {
    axios
      .post(API_URL + "/api/v1/users/login", {
        email: email,
        password: password,
      })
      .then(res => {
        console.log(res.data);
        let userInfo = res.data;
        setUserInfo(userInfo);
        setUserToken(userInfo.token.token);
        setUserRole(userInfo.user.role);

        if (userRole === "PROFESSOR") navigation.navigate("ClassSchedule");
        else if (userRole === "STUDENT") navigation.navigate("StudentCheck");
      })
      .catch(err => {
        alert("Invalid email or password");
      });
  };

  const logout = navigation => {
    setUserInfo(null);
    setUserToken(null);
    setUserRole(null);
    navigation.navigate("Home");
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        userToken,
        userInfo,
        userRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
};
