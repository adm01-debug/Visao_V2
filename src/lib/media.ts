/**
 * Media utilities
 */

export async function getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(constraints);
}

export async function getDisplayMedia(constraints?: DisplayMediaStreamConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia(constraints);
}

export async function enumerateDevices(): Promise<MediaDeviceInfo[]> {
  return navigator.mediaDevices.enumerateDevices();
}

export async function getCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await enumerateDevices();
  return devices.filter(d => d.kind === "videoinput");
}

export async function getMicrophones(): Promise<MediaDeviceInfo[]> {
  const devices = await enumerateDevices();
  return devices.filter(d => d.kind === "audioinput");
}

export default { getUserMedia, getDisplayMedia, enumerateDevices, getCameras, getMicrophones };

