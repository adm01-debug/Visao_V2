import{describe,it,expect,vi}from"vitest";import{analyticsService}from"../analyticsService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({data:[],error:null})})}}));
describe("analyticsService",()=>{it("has getAlertsByType",()=>{expect(typeof analyticsService.getAlertsByType).toBe("function");});});
