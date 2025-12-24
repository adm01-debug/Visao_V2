export const streamingService={
  getHLSUrl(cameraId:string):string{return`/api/streams/${cameraId}/index.m3u8`;},
  getRTSPUrl(cameraId:string):string{return`rtsp://localhost:8554/${cameraId}`;},
  getSnapshotUrl(cameraId:string):string{return`/api/streams/${cameraId}/snapshot.jpg`;},
  async startStream(cameraId:string){console.log(`Starting stream for ${cameraId}`);return{success:true};},
  async stopStream(cameraId:string){console.log(`Stopping stream for ${cameraId}`);return{success:true};},
  async getStreamStatus(cameraId:string){return{cameraId,status:"active",viewers:0};}
};
