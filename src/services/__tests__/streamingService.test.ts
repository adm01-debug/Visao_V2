import{describe,it,expect}from"vitest";import{streamingService}from"../streamingService";
describe("streamingService",()=>{it("getHLSUrl returns url",()=>{const url=streamingService.getHLSUrl("cam1");expect(url).toContain("cam1");});it("getRTSPUrl returns url",()=>{const url=streamingService.getRTSPUrl("cam1");expect(url).toContain("cam1");});});
