import{describe,it,expect,vi}from"vitest";import{alertsService}from"../alertsService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({order:()=>({data:[],error:null})}),insert:()=>({select:()=>({single:()=>({data:{},error:null})})}),update:()=>({eq:()=>({select:()=>({single:()=>({data:{},error:null})})})}),delete:()=>({eq:()=>({error:null})})})}}));
describe("alertsService",()=>{it("has getAll",()=>{expect(typeof alertsService.getAll).toBe("function");});});
