import{describe,it,expect,vi}from"vitest";import{reportsService}from"../reportsService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({gte:()=>({lte:()=>({data:[],error:null})})})})}}));
describe("reportsService",()=>{it("has getAlertsSummary",()=>{expect(typeof reportsService.getAlertsSummary).toBe("function");});});
