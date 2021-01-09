import React, { useContext, useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCheckbox,
  IonLabel,
  IonItem,
  IonDatetime
} from '@ionic/react';
import { createAnimation } from "@ionic/react";
import { getLogger } from '../core';
import { ItemContext } from './PlantProvider';
import { RouteComponentProps } from 'react-router';
import { PlantProps } from './PlantProps';
import { AuthContext } from "../auth";
import { useNetwork } from "./useNetwork";

const log = getLogger('PlantEdit');

interface ItemEditProps extends RouteComponentProps<{
  id?: string;
}> {}

export const PlantEdit: React.FC<ItemEditProps> = ({ history, match }) => {
  const { items, saving, savingError, saveItem, deleteItem, getServerItem, oldItem } = useContext(ItemContext); // TODO: getServerItem, oldItem - for versioning and conflict solving
  const {networkStatus} = useNetwork();

  const { _id } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [hasFlowers, setHasFlowers] = useState(true);
  const [bloomDate, setBloomDate] = useState('');

  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState('');

  const [item, setItem] = useState<PlantProps>();
  const [itemV2, setItemV2] = useState<PlantProps>(); // TODO: versioning

  const [userId, setUserId] = useState(_id);
  const [status, setStatus] = useState(1); // TODO: MARK AS LOCALLY MODIFIED (when REST call succeeds, the state is set to 0)
  const [version, setVersion] = useState(-100);


  useEffect(() => {
    log('useEffect');
    const routeId = match.params.id || '';
    const item = items?.find(it => it._id === routeId);
    setItem(item);
    if (item) {
      setName(item.name);
      setHasFlowers(item.hasFlowers);
      setBloomDate(item.bloomDate);
      setLocation(item.location);
      setPhoto(item.photo);
      setStatus(item.status);
      setVersion(item.version);
      getServerItem && getServerItem(match.params.id!, item?.version); // conflict management
    }
  }, [match.params.id, items, getServerItem]); // added dependency

  useEffect(() => {
    setItemV2(oldItem);
    log("setOldItem: " + JSON.stringify(oldItem));
  }, [oldItem]);

  const handleSave = () => {
    const editedItem = item ? { ...item, name, hasFlowers, bloomDate, location, photo, userId, status: 0, version: item.version ? item.version + 1 : 1 } : { name, hasFlowers, bloomDate, location, photo, userId, status: 0, version: 1 };
    saveItem && saveItem(editedItem, networkStatus.connected).then(
        () => {
          log(JSON.stringify(itemV2));
          if (itemV2 === undefined) history.goBack();
        }); // TODO: changed signature in PlantProvider to accept network status as parameter
  };


  const handleConflict1 = () => {
    if (oldItem) {
      const editedItem = {
        ...item, name, hasFlowers, bloomDate, location, photo, userId, status: 0, version: oldItem?.version + 1
      };
      saveItem && saveItem(editedItem, networkStatus.connected).then(() => {history.goBack();});
    }
  };

  const handleConflict2 = () => {
    if (oldItem) {
      const editedItem = {
        ...item,
        name: oldItem?.name,
        hasFlowers: oldItem?.hasFlowers,
        bloomDate: oldItem?.bloomDate,
        location: oldItem?.location,
        photo: oldItem?.photo,
        userId: oldItem?.userId,
        status: oldItem?.status,
        version: oldItem?.version + 1
      };
      saveItem &&
      editedItem &&
      saveItem(editedItem, networkStatus.connected).then(() => {
        history.goBack();
      });
    }
  };



  const handleDelete = () => {
    const editedItem = item
        ? { ...item, name, hasFlowers, bloomDate, location, photo, userId, status: 0, version: 0 }
  : { name, hasFlowers, bloomDate, location, photo, userId, status: 0, version: 0 };
    deleteItem && deleteItem(editedItem, networkStatus.connected).then(() => history.goBack()); // TODO: changed signature in PlantProvider to accept network status as parameter
  };

  // TODO: Chain animations, 2p
  function chainAnimations() {
    const elB = document.querySelector('.plantName');
    const elC = document.querySelector('.plantFlowers');
    if (elB && elC) {
      const animationA = createAnimation()
          .addElement(elB)
          .duration(5000)
          .fromTo('transform', 'rotate(0)', 'rotate(45deg)');

      const animationB = createAnimation()
          .addElement(elC)
          .duration(7000)
          .fromTo('transform', 'scale(1)', 'scale(0.8)');
      (async () => {
        await animationA.play();
        await animationB.play();
      })();
    }
  }
  useEffect(chainAnimations, []);

  log('render');

  if (itemV2){
    return (
        <IonPage>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleSave}>Save</IonButton>
                <IonButton onClick={handleDelete}>Delete</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>

            {/*// TODO: use Cards insead of Ion ITEMS
        <div>App state is {JSON.stringify(networkStatus)}</div>*/}


            <IonItem>
              <div className="plantName">
              <IonLabel>Name: </IonLabel>
              </div>
              <IonInput value={name} onIonChange={(e) => setName(e.detail.value || "")}/>
            </IonItem>

            <IonItem>
              <IonLabel>Location</IonLabel>
              <IonInput value={location} onIonChange={(e) => setLocation(String(e.detail.value))}/>
            </IonItem>

            <IonItem>
              <IonLabel>Photo</IonLabel>
              <IonInput value={photo} onIonChange={(e) => setPhoto(String(e.detail.value))}/>
            </IonItem>

            <IonItem>
              <IonLabel>HasFlowers: </IonLabel>
              <IonCheckbox checked={hasFlowers} onIonChange={(e) => setHasFlowers(e.detail.checked)}/>
            </IonItem>
            <IonItem>
              <IonLabel>BloomDate: </IonLabel>
              {/*<IonDatetime value={bloomDate} onIonChange={e => setBloomDate(e.detail.value!.substr(0, 10))}/>*/}
              <IonDatetime value={bloomDate} onIonChange={e => setBloomDate(e.detail.value?.split("T")[0]!)}/>{/*modified for Android Date Format*/}
            </IonItem>




            {itemV2 && (
                <>
                  <IonItem>
                    <IonLabel>Name: {itemV2.name}</IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>Location: {itemV2.location}</IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>Photo: {itemV2.photo}</IonLabel>
                  </IonItem>

                  <IonItem>
                    <IonLabel>HasFlowers: </IonLabel>
                    <IonCheckbox checked={itemV2.hasFlowers} disabled />
                  </IonItem>

                  <IonDatetime value={itemV2.bloomDate} disabled/>

                  <IonButton onClick={handleConflict1}>Choose V1</IonButton>
                  <IonButton onClick={handleConflict2}>Choose V2</IonButton>
                </>
            )}




            <IonLoading isOpen={saving} />
            {savingError && (
                <div>{savingError.message || 'Failed to save plant'}</div>
            )}

          </IonContent>
        </IonPage>
    );
  }
  else {
    return (
        <IonPage>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Edit</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={handleSave}>Save</IonButton>
                <IonButton onClick={handleDelete}>Delete</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>

            {/*// TODO: use Cards insead of Ion ITEMS
        <div>App state is {JSON.stringify(networkStatus)}</div>*/}


            <IonItem>
              <IonLabel>Name: </IonLabel>
              <IonInput value={name} onIonChange={(e) => setName(e.detail.value || "")}/>
            </IonItem>

            <IonItem>
              <IonLabel>Location</IonLabel>
              <IonInput value={location} onIonChange={(e) => setLocation(String(e.detail.value))}/>
            </IonItem>

            <IonItem>
              <IonLabel>Photo</IonLabel>
              <IonInput value={photo} onIonChange={(e) => setPhoto(String(e.detail.value))}/>
            </IonItem>

            <IonItem>
              <div className="plantFlowers">
                <IonLabel>HasFlowers: </IonLabel>
              </div>
              <IonCheckbox checked={hasFlowers} onIonChange={(e) => setHasFlowers(e.detail.checked)}/>
            </IonItem>
            <IonItem>
              <IonLabel>BloomDate: </IonLabel>
              {/*<IonDatetime value={bloomDate} onIonChange={e => setBloomDate(e.detail.value!.substr(0, 10))}/>*/}
              <IonDatetime value={bloomDate}
                           onIonChange={e => setBloomDate(e.detail.value?.split("T")[0]!)}/>{/*modified for Android Date Format*/}
            </IonItem>

            <IonLoading isOpen={saving}/>
            {savingError && (
                <div>{savingError.message || 'Failed to save plant'}</div>
            )}

          </IonContent>
        </IonPage>
    );
  }
};

export default PlantEdit;
