// services/garminService.ts
import { GarminConnect } from 'react-native-garmin-connect';

export const garminService = {
  async connect() {
    GarminConnect.initGarminSDK("reticle://");
    return true;
  },
  
  async sendSessionUpdate(shotCount: number, accuracy: number, sessionActive: boolean) {
    GarminConnect.sendMessage(JSON.stringify({
      shotCount: shotCount,
      accuracy: accuracy,
      sessionActive: sessionActive,
    }));
    return true;
  }
};