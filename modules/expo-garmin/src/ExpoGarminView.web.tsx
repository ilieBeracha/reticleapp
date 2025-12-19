// Web is not supported for Garmin
export function showDeviceSelection(): void {
  console.warn('Garmin is not supported on web');
}

export async function getConnectedDevices() {
  console.warn('Garmin is not supported on web');
  return [];
}

export async function sendMessage() {
  throw new Error('Garmin is not supported on web');
}

export async function getAppStatus() {
  throw new Error('Garmin is not supported on web');
}

export async function openAppOnDevice() {
  throw new Error('Garmin is not supported on web');
}

export function addDevicesUpdatedListener() {
  return { remove: () => {} };
}

export function addDeviceStatusChangedListener() {
  return { remove: () => {} };
}

export function addMessageReceivedListener() {
  return { remove: () => {} };
}