import React, {useEffect, useState} from "react";
import { BellAlertIcon, ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/20/solid";
import useFcmToken from "@/hooks/useFCMToken";
import { Spinner } from "flowbite-react";
import { toast } from "sonner";

type Props = {
    topic: string
};

const Bell: React.FC<Props> = ({topic}) => {
    const { token, notificationPermissionStatus } = useFcmToken();
    const [ isSending, setIsSending ] = useState<boolean>(false);
    const [ isSendingUnsubscribe, setIsSendingUnsubscribe ] = useState<boolean>(false);
    const [ subscribed, setSubscribed ] = useState<Array<string>>([]);

    useEffect(() => {
        const r = localStorage.getItem('notifications');
        setSubscribed(r ? r.split(',') : []);
    }, []);

    const handleSendNotification = async () => {
        setIsSending(true);
        const response = await fetch("/send-notification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                topic: topic,
                token: token,
                title: "The Bell rang!",
                message: "Hurry up and check what happened.",
                link: `https://relong.cloud/?token=${topic}`,
                subscribed: subscribed.includes(topic)
            }),
        });

        await response.json()
            .then(() => {
                let newList = subscribed;
                newList.push(topic);
                setSubscribed(newList);
                localStorage.setItem('notifications', subscribed.join(','));
                setIsSending(false);
            })
            .catch(() => {
                toast.error(
                    `Error? Try again...`,
                    {
                        icon: <ExclamationCircleIcon />,
                        position: 'bottom-center'
                    }
                );
                setIsSending(false);
            });
    };

    const handleUnsubscribe = async () => {
        setIsSendingUnsubscribe(true);
        const response = await fetch("/unsubscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                topic: topic,
                token: token
            }),
        });

        await response.json()
            .then(() => {
                let newList = subscribed;
                newList.splice(subscribed.indexOf(topic), 1);
                setSubscribed(newList);
                localStorage.setItem('notifications', subscribed.join(','));
                setIsSendingUnsubscribe(false);
            })
            .catch(() => {
                toast.error(
                    `Error? Try again...`,
                    {
                        icon: <ExclamationCircleIcon />,
                        position: 'bottom-center'
                    }
                );
                setIsSendingUnsubscribe(false);
            });
    };

    return (
        <>
            {notificationPermissionStatus === 'granted' && (
                <div>
                    <>
                        {subscribed.includes(topic) && (
                            <button className="unsubscribe" disabled={isSendingUnsubscribe} onClick={handleUnsubscribe}>
                                <>
                                    {!isSendingUnsubscribe ? (
                                        <XMarkIcon className="size-4" />
                                    ) : (
                                        <div className="absolute flex justify-center items-center w-dvw h-dvh">
                                            <Spinner aria-label="Loading..." size="md" />
                                        </div>
                                    )}
                                </>
                            </button>
                        )}
                    </>
                    <button className="bell" disabled={isSending} onClick={handleSendNotification}>
                        <>
                            {!isSending ? (
                                <BellAlertIcon className="size-6"/>
                            ) : (
                                <div className="absolute flex justify-center items-center w-dvw h-dvh">
                                    <Spinner aria-label="Loading..." size="xl"/>
                                </div>
                            )}
                        </>
                    </button>
                </div>
            )}
        </>
    );
};

export default Bell;