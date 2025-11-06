import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

export default function InviteScreen() {
    const { code } = useLocalSearchParams<{ code: string }>();

    useEffect(() => {
        console.log('code', code);
        AsyncStorage.setItem('pending_invite_code', code);
    }, [code]); 

    return <Redirect href="/auth/sign-in" />;
}