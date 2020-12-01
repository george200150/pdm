import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { PlantProps } from './PlantProps';
import { createItem, getItems, newWebSocket, updateItem, eraseItem, getItem } from './plantApi'; // verioning and conflicts solving
import { AuthContext } from '../auth';
import { Storage } from "@capacitor/core";

const log = getLogger('PlantProvider');

type SaveItemFn = (item: PlantProps, connected: boolean) => Promise<any>;
type DeleteItemFn = (item: PlantProps, connected: boolean) => Promise<any>;
type UpdateServerFn = () => Promise<any>; // TODO: upload local data on valid network connection
type ServerItem = (id: string, version: number) => Promise<any>;

export interface ItemsState {
  items?: PlantProps[],
  oldItem?: PlantProps,
  fetching: boolean,
  fetchingError?: Error | null,
  saving: boolean,
  deleting: boolean;
  savingError?: Error | null,
  deletingError?: Error | null;
  saveItem?: SaveItemFn,
  deleteItem?: DeleteItemFn;
  updateServer?: UpdateServerFn;
  getServerItem?: ServerItem;
}

interface ActionProps {
  type: string,
  payload?: any,
}

const initialState: ItemsState = {
  fetching: false,
  saving: false,
  deleting: false,
  oldItem: undefined
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

const SAVE_ITEM_SUCCEEDED_OFFLINE = "SAVE_ITEM_SUCCEEDED_OFFLINE";
const CONFLICT = "CONFLICT";
const CONFLICT_SOLVED = "CONFLICT_SOLVED";

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

        if (item._id !== undefined) {
          log("ITEM in Plant Provider: " + JSON.stringify(item));

          const index = items.findIndex((it) => it._id === item._id);
          console.log("ITEMS: " + items);
          if (index === -1) {
            items.splice(0, 0, item);
          } else {
            items[index] = item;
          }
          return {...state, items, saving: false};
        }
        return { ...state, items };


      case SAVE_ITEM_SUCCEEDED_OFFLINE: {
        const items = [...(state.items || [])];
        const item = payload.item;
        const index = items.findIndex((it) => it._id === item._id);
        if (index === -1) {
          items.splice(0, 0, item);
        } else {
          items[index] = item;
        }
        return { ...state, items, saving: false };
      }
      case CONFLICT: {
        log("CONFLICT: " + JSON.stringify(payload.item));
        return { ...state, oldItem: payload.item };
      }
      case CONFLICT_SOLVED: {
        log("CONFLICT_SOLVED");
        return { ...state, oldItem: undefined };
      }


      case SAVE_ITEM_FAILED:
        return {...state, savingError: payload.error, saving: false}; // never used


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
        return {...state, deletingError: payload.error, deleting: false}; // never used


      default:
        return state;
    }
  };

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
  children: PropTypes.ReactNodeLike,
}

export const PlantProvider: React.FC<ItemProviderProps> = ({ children }) => {
  const {token, _id} = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const {items, fetching, fetchingError, saving, savingError, deleting, deletingError, oldItem} = state;
  useEffect(getItemsEffect, [token]);
  useEffect(wsEffect, [token]);
  const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token]);


  const deleteItem = useCallback<DeleteItemFn>(deleteItemCallback, [token]);


  const updateServer = useCallback<UpdateServerFn>(updateServerCallback, [
    token,
  ]);
  const getServerItem = useCallback<ServerItem>(itemServer, [token]);

  const value = {
    items,
    fetching,
    fetchingError,
    saving,
    savingError,
    saveItem,
    deleting,
    deleteItem,
    deletingError,
    updateServer,
    getServerItem,
    oldItem
  };


  log('returns');
  return (
      <ItemContext.Provider value={value}>
        {children}
      </ItemContext.Provider>
  );


  async function itemServer(id: string, version: number) {
    const oldItem = await getItem(token, id);
    if (oldItem.version !== version)
      dispatch({type: CONFLICT, payload: {item: oldItem}});
  }

  async function updateServerCallback() {
    const allKeys = Storage.keys();
    let promisedItems;
    var i;

    promisedItems = await allKeys.then(function (allKeys) {
      const promises = [];
      for (i = 0; i < allKeys.keys.length; i++) {
        const promiseItem = Storage.get({key: allKeys.keys[i]});

        promises.push(promiseItem);
      }
      return promises;
    });

    for (i = 0; i < promisedItems.length; i++) {
      const promise = promisedItems[i];
      const plant = await promise.then(function (it) {
        var object; // TODO: extracted var from try scope
        try {
          object = JSON.parse(it.value!);
        } catch (e) {
          return null;
        }
        return object;
      });
      log("PLANT: " + JSON.stringify(plant));
      if (plant !== null) {
        if (plant.status === 1) {
          dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: plant}});
          await Storage.remove({key: plant._id});
          const oldPlant = plant;
          delete oldPlant._id;
          oldPlant.status = 0;
          const newPlant = await createItem(token, oldPlant);
          dispatch({type: SAVE_ITEM_SUCCEEDED, payload: {item: newPlant}});
          await Storage.set({
            key: JSON.stringify(newPlant._id),
            value: JSON.stringify(newPlant),
          });
        } else if (plant.status === 2) {
          plant.status = 0;
          const newPlant = await updateItem(token, plant);
          dispatch({type: SAVE_ITEM_SUCCEEDED, payload: {item: newPlant}});
          await Storage.set({
            key: JSON.stringify(newPlant._id),
            value: JSON.stringify(newPlant),
          });
        } else if (plant.status === 3) {
          plant.status = 0;
          await eraseItem(token, plant);
          await Storage.remove({key: plant._id});
        }
      }
    }
  }

  function getItemsEffect() {
    let canceled = false;
    fetchItems();
    return () => {
      canceled = true;
    };

    async function fetchItems() {
      if (!token?.trim()) {
        return;
      }
      try {
        log("fetchItems started");
        dispatch({type: FETCH_ITEMS_STARTED});
        const items = await getItems(token);
        log("fetchItems succeeded");
        if (!canceled) {
          dispatch({type: FETCH_ITEMS_SUCCEEDED, payload: {items}});
        }
      } catch (error) {
        const allKeys = Storage.keys();
        console.log(allKeys);
        let promisedItems;
        var i;

        promisedItems = await allKeys.then(function (allKeys) {
          // local storage also storages the login token, therefore we must get only Plant objects

          const promises = [];
          for (i = 0; i < allKeys.keys.length; i++) {
            const promiseItem = Storage.get({key: allKeys.keys[i]});

            promises.push(promiseItem);
          }
          return promises;
        });

        const plants = [];
        for (i = 0; i < promisedItems.length; i++) {
          const promise = promisedItems[i];
          const plant = await promise.then(function (it) {
            var object; // TODO: extracted var from try scope
            try {
              object = JSON.parse(it.value!);
            } catch (e) {
              return null;
            }
            console.log(typeof object);
            console.log(object);
            if (object.status !== 2) {
              return object;
            }
            return null;
          });
          if (plant != null) {
            plants.push(plant);
          }
        }

        const items = plants;
        dispatch({type: FETCH_ITEMS_SUCCEEDED, payload: {items: items}});
      }
    }
  }

  function random_id() {
    return "_" + Math.random().toString(36).substr(2, 9);
  }

  async function saveItemCallback(plant: PlantProps, connected: boolean) {
    try {
      if (!connected) {
        throw new Error();
      }
      log("saveItem started");
      dispatch({type: SAVE_ITEM_STARTED});
      const savedItem = await (plant._id
          ? updateItem(token, plant)
          : createItem(token, plant));

      log("saveItem succeeded");
      dispatch({type: SAVE_ITEM_SUCCEEDED, payload: {item: savedItem}});
      dispatch({type: CONFLICT_SOLVED});
    } catch (error) {
      log("saveItem failed with errror:", error);

      if (plant._id === undefined) {
        plant._id = random_id();
        plant.status = 1;
        alert("Plant saved locally");
      } else {
        plant.status = 2;
        alert("Plant updated locally");
      }
      await Storage.set({
        key: plant._id,
        value: JSON.stringify(plant),
      });

      dispatch({type: SAVE_ITEM_SUCCEEDED_OFFLINE, payload: {item: plant}});
    }
  }

  async function deleteItemCallback(plant: PlantProps, connected: boolean) {
    try {
      if (!connected) {
        throw new Error();
      }
      dispatch({type: DELETE_ITEM_STARTED});
      const deletedItem = await eraseItem(token, plant);
      console.log(deletedItem);
      await Storage.remove({key: plant._id!});
      dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: plant}});
    } catch (error) {

      plant.status = 3;
      await Storage.set({
        key: JSON.stringify(plant._id),
        value: JSON.stringify(plant),
      });
      alert("Plant deleted locally");
      dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: plant}});
    }
  }

  function wsEffect() {
    let canceled = false;
    log("wsEffect - connecting");
    let closeWebSocket: () => void;
    if (token?.trim()) {
      closeWebSocket = newWebSocket(token, (message) => {
        if (canceled) {
          return;
        }
        const {type, payload: item} = message;
        log(`ws message, item ${type} ${item._id}`);
        if (type === "created" || type === "updated") {
          //dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } }); - comment this in order to avoid notifications
        }
      });
    }
    return () => {
      log("wsEffect - disconnecting");
      canceled = true;
      closeWebSocket?.();
    };
  }
};


  /*function getItemsEffect() {
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
             var object; // TODO: extracted var from try scope
             try {
               object = JSON.parse(it.value);
             } catch (e) {
               return null;
             }
             console.log(typeof object);
             console.log(object);
             if (object.userId === _id && object.status !== 2) { // check ownership of each object todo: AND IF IT WAS NOT DELETED LOCALLY
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
         //alert("OFFLINE!");
         console.log("//alert(\"OFFLINE!\");")
         dispatch({ type: FETCH_ITEMS_FAILED, payload: { items: items } });
       }
     }
   }

   async function saveItemCallback(plant: PlantProps, connected: boolean) { // TODO: modified in order to accept network status information
     try {
       plant.version += 1;// TODO: data modified must increment its version number
       if (!connected){throw new Error()}
       log('saveItem started');
       dispatch({ type: SAVE_ITEM_STARTED });
       const savedItem = await (plant._id ? updateItem(token, plant) : createItem(token, plant));
       plant.status = 0; // successfully uploaded
       log('saveItem succeeded');
       dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: savedItem } });
     } catch (error) {
       log('saveItem failed');

       // TODO: HANDLE NEW ITEM CREATION (undefined "_id" property else)
       if (plant._id === "") {
         plant._id = Date.now().toString()
       }

       // TODO: the apps stores data locally
       plant.status = 1; // todo: set the data status as MODIFIED OFFLINE
       await Storage.remove({key: plant._id!});
       await Storage.set({ key: plant._id!, value: JSON.stringify(plant) });



       // TODO: Inform user about the items not sent to the server
       alert("ITEM WAS SAVED LOCALLY!");

       //dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
       dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: plant } });
     }
   }

   async function deleteItemCallback(plant: PlantProps, connected: boolean) { // TODO: modified in order to accept network status information
     try {
       plant.version += 1;// TODO: data modified must increment its version number
       // if (!connected){throw new Error()}
       log("delete started");
       dispatch({type: DELETE_ITEM_STARTED});
       const deletedItem = await eraseItem(token, plant);
       plant.status = 0; // successfully uploaded
       log("delete succeeded");
       console.log(deletedItem);
       dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: plant}});
     } catch (error) {
       log("delete failed");

       // TODO: the apps stores data locally
       plant.status = 2; // todo: set the data status as DELETED OFFLINE
       await Storage.remove({key: plant._id!});
       await Storage.set({key: plant._id!, value: JSON.stringify(plant)});


       // TODO: Inform user about the items not sent to the server
       alert("ITEM WAS DELETED LOCALLY!");

       //dispatch({type: DELETE_ITEM_FAILED, payload: {error}});
       dispatch({type: DELETE_ITEM_SUCCEEDED, payload: {item: plant}});
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
};*/
