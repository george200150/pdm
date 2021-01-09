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
import { createAnimation } from "@ionic/react";
import { add } from 'ionicons/icons';
import Plant from './Plant';
import { getLogger } from '../core';
import { ItemContext } from './PlantProvider';
import { AuthContext } from "../auth";
import { PlantProps } from "./PlantProps";

import { useAppState } from './useAppState';
import { useNetwork } from './useNetwork';
import { useBackgroundTask } from "./useBackgroundTask";
import { Network, NetworkStatus } from "@capacitor/core";


const log = getLogger('PlantList');

const PlantList: React.FC<RouteComponentProps> = ({ history }) => {
    const {appState} = useAppState();
    const {networkStatus} = useNetwork();
    const { saveItem, deleteItem, items, fetching, fetchingError, updateServer  } = useContext(ItemContext); // TODO: imported more from Provider (updateServer should solve networkStateChange)
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



    useEffect(() => { // I had a hard time trying to make background tasks work...
        if (networkStatus.connected) {
            updateServer && updateServer();
        }
    }, [networkStatus.connected]);




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
  }, [filter, items]);

  useEffect(() => {
    if (search && items) {
      setItemsShow(items.filter((plant) => {if(search !== "-"){return plant.name.startsWith(search)}else{return true}}));
    }
  }, [search, items]);




// TODO: Use basic animation, 3p
    function simpleAnimation() {
        const el = document.querySelector(".networkStatus");
        if (el) {
            const animation = createAnimation()
                .addElement(el)
                .duration(5000)
                .direction("alternate")
                .iterations(Infinity)
                .keyframes([
                    { offset: 0, transform: "scale(1)", opacity: "1" },
                    {
                        offset: 1,
                        transform: "scale(0.5)",
                        opacity: "0.5",
                    },
                ]);
            animation.play();
        }
    }
    useEffect(simpleAnimation, []);


// TODO: Use grouped animations, 2p
    function groupAnimations() {
        const elB = document.querySelector('.searchBar');
        const elC = document.querySelector('.select');
        if (elB && elC) {
            const animationA = createAnimation()
                .addElement(elB)
                .fromTo('transform', 'scale(1)','scale(0.75)');
            const animationB = createAnimation()
                .addElement(elC)
                .fromTo('transform', 'rotate(0)', 'rotate(180deg)');
            const parentAnimation = createAnimation()
                .duration(10000)
                .addAnimation([animationA, animationB]);
            parentAnimation.play();    }
    }
    useEffect(groupAnimations, []);





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

            <div className="searchBar">
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
            </div>
            <div className="select">
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
            </div>

            <div>App state is {JSON.stringify(appState)}</div>
            <div className="networkStatus">
                Network is {networkStatus.connected ? "online" : "offline"}
            </div>


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



/*
    useBackgroundTask(() => new Promise(resolve => {
        console.log("My Background Task");
        continuouslyCheckNetwork();
    }));


    async function continuouslyCheckNetwork() {
        const handler = Network.addListener('networkStatusChange', handleNetworkStatusChange);
        Network.getStatus().then(handleNetworkStatusChange);
        let canceled = false;
        return () => {
            canceled = true;
            handler.remove();
        }

        function handleNetworkStatusChange(status: NetworkStatus) {
            console.log('useNetwork - status change - PLANT LIST . TSX', status);
            if (!canceled && status.connected) {
                console.log('if (!canceled && status.connected) {')
                var i;
                console.log(itemsShow)
                console.log(itemsShow.length)
                for (i = 0; i < itemsShow.length; i++) { // version === 0 means that items are up to date with server data
                    var plant = itemsShow[i];
                    if (plant.version === 1) { // save/update locally modified items
                        console.log("if (plant.version === 1) { // save/update locally modified items")
                        //saveItemCallback(plant, status.connected)
                        saveItem && saveItem(plant, networkStatus.connected).then(() => history.goBack());
                    } else if (plant.version === 2) { // delete locally deleted items
                        console.log("} else if (plant.version === 2) { // delete locally deleted items")
                        //deleteItemCallback(plant, status.connected)
                        deleteItem && deleteItem(plant, networkStatus.connected).then(() => history.goBack());
                    }
                }
            }
        }
    }
*/
