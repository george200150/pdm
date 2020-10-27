import React from 'react';
import { IonItem, IonLabel } from '@ionic/react';
import { PlantProps } from './PlantProps';

interface ItemPropsExt extends PlantProps {
    onEdit: (_id?: string) => void;
}

const Plant: React.FC<ItemPropsExt> = ({ _id, name, onEdit }) => {
    return (
        <IonItem onClick={() => onEdit(_id)}>
            <IonLabel>{name}</IonLabel>
        </IonItem>
    );
};

export default Plant;