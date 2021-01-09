import React, { useState } from "react";
import {
    IonItem,
    IonLabel,
    IonModal,
    createAnimation,
    IonButton,
} from "@ionic/react";
import { PlantProps } from './PlantProps';

interface ItemPropsExt extends PlantProps {
    onEdit: (id?: string) => void;
}

// TODO: Override existing component animations, 2p
const Plant: React.FC<ItemPropsExt> = ({ _id, name, onEdit, photo }) => {
    const [showModal, setShowModal] = useState(false);
    const enterAnimation = (baseEl: any) => {
        const backdropAnimation = createAnimation()
            .addElement(baseEl.querySelector("ion-backdrop")!)
            .fromTo("opacity", "0.01", "var(--backdrop-opacity)");

        const wrapperAnimation = createAnimation()
            .addElement(baseEl.querySelector(".modal-wrapper")!)
            .keyframes([
                { offset: 0, opacity: "0", transform: "scale(0)" },
                { offset: 1, opacity: "0.99", transform: "scale(1)" },
            ]);

        return createAnimation()
            .addElement(baseEl)
            .easing("ease-out")
            .duration(500)
            .addAnimation([backdropAnimation, wrapperAnimation]);
    };

    const leaveAnimation = (baseEl: any) => {
        return enterAnimation(baseEl).direction("reverse");
    };
    return (
        <>
            <IonItem>
                <IonLabel onClick={() => onEdit(_id)}>{name}</IonLabel>
                <img
                    src={photo}
                    style={{ height: 50 }}
                    onClick={() => {
                        setShowModal(true);
                    }}
                />
                <IonModal
                    isOpen={showModal}
                    enterAnimation={enterAnimation}
                    leaveAnimation={leaveAnimation}
                >
                    <img src={photo} />
                    <IonButton onClick={() => setShowModal(false)}>Close Modal</IonButton>
                </IonModal>
            </IonItem>
        </>
    );
};

export default Plant;
