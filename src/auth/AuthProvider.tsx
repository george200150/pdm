import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { login as loginApi } from './authApi';
import { Plugins } from "@capacitor/core";

const { Storage } = Plugins;

const log = getLogger('AuthProvider');

type LoginFn = (username?: string, password?: string) => void;
type LogoutFn = () => void;

export interface AuthState {
  authenticationError: Error | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  login?: LoginFn;
  logout?: LogoutFn;
  pendingAuthentication?: boolean;
  username?: string;
  password?: string;
  token: string;
  _id: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isAuthenticating: false,
  authenticationError: null,
  pendingAuthentication: false,
  token: "",
  _id: "",
};

export const AuthContext = React.createContext<AuthState>(initialState);

interface AuthProviderProps {
  children: PropTypes.ReactNodeLike,
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);
  const {
    isAuthenticated,
    isAuthenticating,
    authenticationError,
    pendingAuthentication,
    token,
    _id
  } = state;
  const login = useCallback<LoginFn>(loginCallback, []);
  const logout = useCallback<LogoutFn>(logoutCallback, []);
  useEffect(authenticationEffect, [pendingAuthentication]);
  const value = {
    isAuthenticated,
    login,
    logout,
    isAuthenticating,
    authenticationError,
    token,
    _id
  };
  log("render");
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

  function loginCallback(username?: string, password?: string): void {
    log("login");
    setState({
      ...state,
      pendingAuthentication: true,
      username,
      password
    });
  }
  function logoutCallback(): void {
    log("logout");
    setState({
      ...state,
      isAuthenticated: false,
      token: "",
    });
    (async () => {
      //await Storage.remove({ key: "user" });
      //await Storage.remove({ key: "_id" });

      /*var i;
      await Storage.keys().then(function (allKeys) { // TODO: made app delete all data on logout -> ensures user ownership unicity

        for (i = 0; i < allKeys.keys.length; i++) {
          Storage.remove({key: allKeys.keys[i]});
        }
      });*/
    await Storage.clear(); // snickers?
    })();
  }

  function authenticationEffect() {
    let canceled = false;
    authenticate();
    return () => {
      canceled = true;
    }

    async function authenticate() {
      var tokenStorage = await Storage.get({ key: "user" });
      var _idStorage = await Storage.get({ key: "_id" });
      console.log("token "+tokenStorage.value);
      if (tokenStorage.value) {
        setState({
          ...state,
          token: tokenStorage.value,
          _id: _idStorage.value!,
          pendingAuthentication: false,
          isAuthenticated: true,
          isAuthenticating: false,
        });
      }
      if (!pendingAuthentication) {
        log('authenticate, !pendingAuthentication, return');
        return;
      }
      try {
        log('authenticate...');
        setState({
          ...state,
          isAuthenticating: true,
        });
        const { username, password } = state;
        const { token, _id } = await loginApi(username, password);
        console.log("_id");
        console.log(_id);
        if (canceled) {
          return;
        }
        log('authenticate succeeded');
        await Storage.set({ key: "user", value: token }); // save the login token in the local storage (on refresh no more need to re-login)
        await Storage.set({ key: "_id", value: _id }); // save the login token in the local storage (on refresh no more need to re-login)
        setState({
          ...state,
          token,
          _id,
          pendingAuthentication: false,
          isAuthenticated: true,
          isAuthenticating: false,
        });
      } catch (error) {
        if (canceled) {
          return;
        }
        log('authenticate failed');
        setState({
          ...state,
          authenticationError: error,
          pendingAuthentication: false,
          isAuthenticating: false,
        });
      }
    }
  }
};
