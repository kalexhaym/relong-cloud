import admin from "firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = require("@/service_key.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export async function POST(request: NextRequest) {
    const { token, topic } = await request.json();

    try {
        await admin.messaging().unsubscribeFromTopic(token, topic);

        return NextResponse.json({ success: true, message: "Unsubscribed!" });
    } catch (error) {
        return NextResponse.json({ success: false, error });
    }
}