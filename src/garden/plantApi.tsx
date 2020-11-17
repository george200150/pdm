import axios from 'axios';
import {authConfig, baseUrl, getLogger, withLogs} from '../core';
import {PlantProps} from './PlantProps';
import {Plugins} from "@capacitor/core";

const { Storage } = Plugins;
const itemUrl = `http://${baseUrl}/api/plant`;


export const getItems: (token: string) => Promise<PlantProps[]> = (token) => {

  var result = axios.get(itemUrl, authConfig(token));
  result.then(function (result) {
    console.log("Entering plantApi - getItems - No Network Will Throw HERE!")
    result.data.forEach(async (plant: PlantProps) => {
      await Storage.set({
        key: plant._id!,
        value: JSON.stringify({
          id: plant._id,
          name: plant.name,
          hasFlowers: plant.hasFlowers,
          bloomDate: plant.bloomDate,
          location: plant.location,
          photo: plant.photo,
          userId: plant.userId
        }),
      });
    });
  });
  return withLogs(result, "getItems");
};


export const createItem: (
    token: string,
    item: PlantProps
) => Promise<PlantProps[]> = (token, plant) => {
  var result = axios.post(itemUrl, plant, authConfig(token));
  result.then(async function (r) {
    var plant = r.data;
    await Storage.set({
      key: plant._id!,
      value: JSON.stringify({
        id: plant._id,
        name: plant.name,
        hasFlowers: plant.hasFlowers,
        bloomDate: plant.bloomDate,
        location: plant.location,
        photo: plant.photo
      }),
    });
  });
  return withLogs(result, "createItem");
};


export const updateItem: (
    token: string,
    item: PlantProps
) => Promise<PlantProps[]> = (token, plant) => {
  var result = axios.put(`${itemUrl}/${plant._id}`, plant, authConfig(token));
  result.then(async function (r) {
    var plant = r.data;
    await Storage.set({
      key: plant._id!,
      value: JSON.stringify({
        id: plant._id,
        name: plant.name,
        hasFlowers: plant.hasFlowers,
        bloomDate: plant.bloomDate,
        location: plant.location,
        photo: plant.photo
      }),
    });
  });
  return withLogs(result, "updateItem");
};


export const eraseItem: (
    token: string,
    item: PlantProps
) => Promise<PlantProps[]> = (token, plant) => {
  var result = axios.delete(`${itemUrl}/${plant._id}`, authConfig(token));
  result.then(async function (r) {
    await Storage.remove({ key: plant._id! });
  });
  return withLogs(result, "deleteItem");
};

interface MessageData {
  type: string;
  payload: PlantProps;
}

const log = getLogger('ws');

export const newWebSocket = (token: string, onMessage: (data: MessageData) => void) => {
  const ws = new WebSocket(`ws://${baseUrl}`);
  ws.onopen = () => {
    log('web socket onopen');
    const message = JSON.stringify({ type: 'authorization', payload: { token } });
    console.log(message);
    ws.send(message);
  };
  ws.onclose = () => {
    log('web socket onclose');
  };
  ws.onerror = error => {
    log('web socket onerror', error);
  };
  ws.onmessage = messageEvent => {
    log('web socket onmessage');
    onMessage(JSON.parse(messageEvent.data));
  };
  return () => {
    ws.close();
  }
}