import{describe,it,expect,vi}from"vitest";import{recognitionService}from"../recognitionService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:vi.fn()},from:()=>({select:()=>({order:()=>({data:[],error:null})})})}}));
describe("recognitionService",()=>{it("has detectFaces",()=>{expect(typeof recognitionService.detectFaces).toBe("function");});});
