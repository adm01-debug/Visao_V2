import{describe,it,expect,vi}from"vitest";import{zonesService}from"../zonesService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({order:()=>({data:[],error:null})})})}}));
describe("zonesService",()=>{it("has getAll",()=>{expect(typeof zonesService.getAll).toBe("function");});});
