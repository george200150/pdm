import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { PlantProps } from './PlantProps';
import { createItem, getItems, newWebSocket, updateItem, eraseItem } from './plantApi';
import { AuthContext } from '../auth';
import {Storage} from "@capacitor/core";

const log = getLogger('PlantProvider');

type SaveItemFn = (item: PlantProps) => Promise<any>;
type DeleteItemFn = (item: PlantProps) => Promise<any>;

export interface ItemsState {
  items?: PlantProps[],
  fetching: boolean,
  fetchingError?: Error | null,
  saving: boolean,
  deleting: boolean;
  savingError?: Error | null,
  deletingError?: Error | null;
  saveItem?: SaveItemFn,
  deleteItem?: DeleteItemFn;
}

interface ActionProps {
  type: string,
  payload?: any,
}

const initialState: ItemsState = {
  fetching: false,
  saving: false,
  deleting: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';
const DELETE_ITEM_STARTED = "DELETE_ITEM_STARTED";
const DELETE_ITEM_SUCCEEDED = "DELETE_ITEM_SUCCEEDED";
const DELETE_ITEM_FAILED = "DELETE_ITEM_FAILED";

const reducer: (state: ItemsState, action: ActionProps) => ItemsState =
  (state, { type, payload }) => {
    switch (type) {
      case FETCH_ITEMS_STARTED:
        return {...state, fetching: true, fetchingError: null};
      case FETCH_ITEMS_SUCCEEDED:
        return {...state, items: payload.items, fetching: false};
      case FETCH_ITEMS_FAILED:
        //return {...state, fetchingError: payload.error, fetching: false};
        return {...state, items: payload.items, fetching: false};
      case SAVE_ITEM_STARTED:
        return {...state, savingError: null, saving: true};
      case SAVE_ITEM_SUCCEEDED:
        const items = [...(state.items || [])];
        const item = payload.item;
        const index = items.findIndex((it) => it._id === item._id);
        console.log("ITEMS: " + items);
        if (index === -1) {
          items.splice(0, 0, item);
        } else {
          items[index] = item;
        }
        return {...state, items, saving: false};
      case SAVE_ITEM_FAILED:
        return {...state, savingError: payload.error, saving: false};


      case DELETE_ITEM_STARTED:
        return {...state, deletingError: null, deleting: true};
      case DELETE_ITEM_SUCCEEDED: {
        const items = [...(state.items || [])];
        const item = payload.item;
        const index = items.findIndex((it) => it._id === item._id);
        items.splice(index, 1);
        return {...state, items, deleting: false};
      }
      case DELETE_ITEM_FAILED:
        return {...state, deletingError: payload.error, deleting: false};


      default:
        return state;
    }
  };

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
  children: PropTypes.ReactNodeLike,
}

export const PlantProvider: React.FC<ItemProviderProps> = ({ children }) => {
  const { token, _id } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { items, fetching, fetchingError, saving, savingError, deleting, deletingError } = state;
  useEffect(getItemsEffect, [token]);
  useEffect(wsEffect, [token]);
  const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token]);


  const deleteItem = useCallback<DeleteItemFn>(deleteItemCallback, [token]);
  const value = { items, fetching, fetchingError, saving, savingError, saveItem, deleting, deleteItem, deletingError };


  log('returns');
  return (
    <ItemContext.Provider value={value}>
      {children}
    </ItemContext.Provider>
  );

  function getItemsEffect() {
    let canceled = false;
    fetchItems();
    return () => {
      canceled = true;
    }

    async function fetchItems() {
      console.log("Entering PlantProvider - fetchItems")
      if (!token?.trim()) {
        return;
      }
      try {
        log('fetchItems started');
        dispatch({ type: FETCH_ITEMS_STARTED });
        const items = await getItems(token);
        console.log("(try) ITEMS FROM getItems CALL: ");
        console.log(items)
        log('fetchItems succeeded');
        if (!canceled) {
          dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
        }
      } catch (error) {
        log('fetchItems failed');

        const allKeys = Storage.keys();
        let promisedItems;
        var i;

        promisedItems = await allKeys.then(function (allKeys) { // local storage also storages the login token, therefore we must get only Plant objects

          const promises = [];
          for (i = 0; i < allKeys.keys.length; i++) {
            const promiseItem = Storage.get({key: allKeys.keys[i]});

            promises.push(promiseItem);
          }
          return promises;
        });

        const plantItems = [];
        for (i = 0; i < promisedItems.length; i++) {
          const promise = promisedItems[i];
          const plant = await promise.then(function (it) {
            try {
              var object = JSON.parse(it.value);
            } catch (e) {
              return null;
            }
            console.log(typeof object);
            console.log(object);
            if (object.userId === _id) { // check ownership of each object
              return object;
            }
            return null;
          });
          if (plant != null) {
            plantItems.push(plant);
          }
        }

        console.log("(catch) ITEMS FROM getItems CALL: ")
        console.log(plantItems)
        const items = plantItems;
        alert("OFFLINE!");
        dispatch({ type: FETCH_ITEMS_FAILED, payload: { items: items } });
      }
    }
  }

  async function saveItemCallback(item: PlantProps) {
    try {
      log('saveItem started');
      dispatch({ type: SAVE_ITEM_STARTED });
      const savedItem = await (item._id ? updateItem(token, item) : createItem(token, item));
      log('saveItem succeeded');
      dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: savedItem } });
    } catch (error) {
      log('saveItem failed');
      dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
    }
  }

  async function deleteItemCallback(item: PlantProps) {
    try {
      log("delete started");
      dispatch({type: DELETE_ITEM_STARTED});
      const deletedItem = await eraseItem(token, item);
      log("delete succeeded");
      console.log(deletedItem);
      dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: item}});
    } catch (error) {
      log("delete failed");
      dispatch({type: DELETE_ITEM_FAILED, payload: {error}});
    }
  }

  function wsEffect() {
    let canceled = false;
    log('wsEffect - connecting');
    let closeWebSocket: () => void;
    if (token?.trim()) {
      closeWebSocket = newWebSocket(token, message => {
        if (canceled) {
          return;
        }
        const { type, payload: item } = message;
        log(`ws message, item ${type}`);
        if (type === 'created' || type === 'updated') {
          dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } });
        } // ws error - on refresh after update - returns 500
      });
    }
    return () => {
      log('wsEffect - disconnecting');
      canceled = true;
      closeWebSocket?.();
    }
  }
};
