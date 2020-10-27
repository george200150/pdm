import React, { useContext } from 'react';
import { RouteComponentProps } from 'react-router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { add } from 'ionicons/icons';
import Plant from './Plant';
import { getLogger } from '../core';
import { ItemContext } from './PlantProvider';

const log = getLogger('PlantList');

const PlantList: React.FC<RouteComponentProps> = ({ history }) => {
  const { items, fetching, fetchingError } = useContext(ItemContext);
  log('render');
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Item List</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching plants"/>
        {items && (
          <IonList>

            {items.map(({ _id, name, hasFlowers, bloomDate, location, photo }) => (
                <Plant
              key={_id}
              _id={_id}
              name={name}
              hasFlowers={hasFlowers}
              bloomDate={bloomDate}
              location={location}
              photo={photo}
              onEdit={(id) => history.push(`/plant/${id}`)}
                />
              ))}

          </IonList>
        )}
        {fetchingError && (
          <div>{fetchingError.message || 'Failed to fetch items'}</div>
        )}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/plant')}>
            <IonIcon icon={add}/>
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default PlantList;