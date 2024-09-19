import admin from "firebase-admin";
import { Message } from "firebase-admin/messaging";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = require("@/service_key.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export async function POST(request: NextRequest) {
    const { token, topic, title, message, link, subscribed } = await request.json();

    const payload: Message = {
        topic: topic,
        notification: {
            title: title,
            body: message,
        },
        webpush: link && {
            fcmOptions: {
                link,
            },
        },
    };

    try {
        if (!subscribed) {
            await admin.messaging().subscribeToTopic(token, topic);
        }
        await admin.messaging().send(payload);

        return NextResponse.json({ success: true, message: "Notification sent!" });
    } catch (error) {
        return NextResponse.json({ success: false, error });
    }
}