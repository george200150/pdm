import React, {useContext, useEffect, useState} from 'react';
import { RouteComponentProps } from 'react-router';
import { Redirect } from "react-router-dom";
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSelect,
  IonSelectOption,
  IonSearchbar
} from '@ionic/react';
import { add } from 'ionicons/icons';
import Plant from './Plant';
import { getLogger } from '../core';
import { ItemContext } from './PlantProvider';
import {AuthContext} from "../auth";
import {PlantProps} from "./PlantProps";

import {useAppState} from './useAppState';
import {useNetwork} from './useNetwork';
import {useBackgroundTask} from "./useBackgroundTask";
import {Network, NetworkStatus} from "@capacitor/core";



const log = getLogger('PlantList');

const PlantList: React.FC<RouteComponentProps> = ({ history }) => {
    const {appState} = useAppState();
    const {networkStatus} = useNetwork();





    useBackgroundTask(() => new Promise(resolve => {
        console.log("My Background Task");
        continuouslyCheckNetwork();
    }));


    async function continuouslyCheckNetwork(){
        const handler = Network.addListener('networkStatusChange', handleNetworkStatusChange);
        Network.getStatus().then(handleNetworkStatusChange);
        let canceled = false;
        return () => {
            canceled = true;
            handler.remove();
        }

        function handleNetworkStatusChange(status: NetworkStatus) {
            console.log('useNetwork - status change', status);
            if (!canceled) {
                // TODO: TRY TO SEND LOCAL DATA TO SERVER
            }
        }
    }




  const { items, fetching, fetchingError } = useContext(ItemContext);
  const [disableInfiniteScroll, setDisableInfiniteScroll] = useState<boolean>(
      false
  );
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState<string>("");
  const [pos, setPos] = useState(16);
  const selectOptions = ["has flowers", "no flowers"];
  const [itemsShow, setItemsShow] = useState<PlantProps[]>([]);
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout?.();
    return <Redirect to={{ pathname: "/login" }} />;
  };
  useEffect(() => {
    if (items?.length) {
      setItemsShow(items.slice(0, 16));
    }
  }, [items]);
  log("render");

  async function searchNext($event: CustomEvent<void>) {
    if (items && pos < items.length) {
      setItemsShow([...itemsShow, ...items.slice(pos, 17 + pos)]);
      setPos(pos + 17);
    } else {
      setDisableInfiniteScroll(true);
    }
    ($event.target as HTMLIonInfiniteScrollElement).complete();
  }

  useEffect(() => {
    if (filter && items) {
      const boolType = filter === "has flowers";
      setItemsShow(items.filter((plant) => plant.hasFlowers === boolType));
    }
  }, [filter]);

  useEffect(() => {
    if (search && items) {
      setItemsShow(items.filter((plant) => {if(search !== "-"){return plant.name.startsWith(search)}else{return true}}));
    }
  }, [search]);
  return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Plant List</IonTitle>
            <IonButton onClick={handleLogout}>Logout</IonButton>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen>
          <IonLoading isOpen={fetching} message="Fetching plants" />
          <IonSearchbar
    value={search}
    debounce={500}
    onIonChange={(e) => {
      if (e.detail.value!.length > 0) {
        setSearch(e.detail.value!)
      } else {
        setSearch("-")
      }
    }}
    />
          <IonSelect
              value={filter}
              placeholder="Select flowers"
              onIonChange={(e) => setFilter(e.detail.value)}
          >
            {selectOptions.map((option) => (
                <IonSelectOption key={option} value={option}>
                  {option}
                </IonSelectOption>
            ))}
          </IonSelect>

          <div>App state is {JSON.stringify(appState)}</div>
          <div>Network status is {JSON.stringify(networkStatus)}</div>

          {itemsShow &&
          itemsShow.map((plant: PlantProps) => {
            return (
                <Plant
                    key={plant._id}
                    _id={plant._id}
                    name={plant.name}
                    hasFlowers={plant.hasFlowers}
                    bloomDate={plant.bloomDate}
                    location={plant.location}
                    photo={plant.photo}
                    userId={plant.userId}
                    status={plant.status}
                    version={plant.version}
                    onEdit={(id) => history.push(`/plant/${id}`)}
                />
            );
          })}
          <IonInfiniteScroll
              threshold="100px"
              disabled={disableInfiniteScroll}
              onIonInfinite={(e: CustomEvent<void>) => searchNext(e)}
          >
            <IonInfiniteScrollContent loadingText="Loading more plants..."/>
          </IonInfiniteScroll>
          {fetchingError && (
              <div>{fetchingError.message || "Failed to fetch plants"}</div>
          )}
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => history.push("/plant")}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        </IonContent>
      </IonPage>
  );
};

export default PlantList;
