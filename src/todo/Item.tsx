import React from 'react';
import { IonItem, IonLabel } from '@ionic/react';
import { ItemProps } from './ItemProps';

interface ItemPropsExt extends ItemProps {
    onEdit: (id?: string) => void;
}

const Item: React.FC<ItemPropsExt> = ({ id, name,/* hasFlowers, bloomingDate, location, photo,*/ onEdit }) => {
    return (
        <IonItem onClick={() => onEdit(id)}>
            <IonLabel>{name}</IonLabel>
            {/*<IonLabel>{hasFlowers}</IonLabel>*/}
            {/*<IonLabel>{bloomingDate}</IonLabel>*/}
            {/*<IonLabel>{location}</IonLabel>*/}
            {/*<IonLabel>{photo}</IonLabel>*/}
        </IonItem>
    );
};

export default Item;
