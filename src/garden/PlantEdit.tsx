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
import { getLogger } from '../core';
import { ItemContext } from './PlantProvider';
import { RouteComponentProps } from 'react-router';
import { PlantProps } from './PlantProps';
import {AuthContext} from "../auth";

const log = getLogger('PlantEdit');

interface ItemEditProps extends RouteComponentProps<{
  id?: string;
}> {}

const PlantEdit: React.FC<ItemEditProps> = ({ history, match }) => {
  const { items, saving, savingError, saveItem, deleteItem } = useContext(ItemContext);

  const { _id } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [hasFlowers, setHasFlowers] = useState(true);
  const [bloomDate, setBloomDate] = useState('');

  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState('');

  const [item, setItem] = useState<PlantProps>();

  const [userId, setUserId] = useState(_id);

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
    }
  }, [match.params.id, items]);
  const handleSave = () => {
    const editedItem = item ? { ...item, name, hasFlowers, bloomDate, location, photo, userId } : { name, hasFlowers, bloomDate, location, photo, userId };
    saveItem && saveItem(editedItem).then(() => history.goBack());
  };

  const handleDelete = () => {
    const editedItem = item
        ? { ...item, name, hasFlowers, bloomDate, location, photo, userId }
  : { name, hasFlowers, bloomDate, location, photo, userId };
    deleteItem && deleteItem(editedItem).then(() => history.goBack());
  };

  log('render');
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

        // TODO: use Cards insead of Ion ITEMS
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
          <IonLabel>HasFlowers: </IonLabel>
          <IonCheckbox checked={hasFlowers} onIonChange={(e) => setHasFlowers(e.detail.checked)}/>
        </IonItem>
        <IonItem>
          <IonLabel>BloomDate: </IonLabel>
          <IonDatetime value={bloomDate} onIonChange={e => setBloomDate(e.detail.value!.substr(0, 10))}/>
        </IonItem>
        <IonLoading isOpen={saving} />
        {savingError && (
            <div>{savingError.message || 'Failed to save plant'}</div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default PlantEdit;