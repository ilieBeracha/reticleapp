export interface GarminDevice {
  uuid: string;
  friendlyName: string;
  modelName: string;
}

export interface AppStatus {
  isInstalled: boolean;
  version: number;
}

export interface DevicesUpdatedEvent {
  devices: GarminDevice[];
}

export interface DeviceStatusChangedEvent {
  deviceId: string;
  status: number;
}

export interface MessageReceivedEvent {
  message: any;
  appId: string;
}