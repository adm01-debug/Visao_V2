import{describe,it,expect,vi}from"vitest";import{camerasService}from"../camerasService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({order:()=>({data:[],error:null})})})}}));
describe("camerasService",()=>{it("has getAll",()=>{expect(typeof camerasService.getAll).toBe("function");});});
