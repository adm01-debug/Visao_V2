import{describe,it,expect,vi}from"vitest";import{notificationsService}from"../notificationsService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({data:[],error:null})}),functions:{invoke:vi.fn()}}}));
describe("notificationsService",()=>{it("has getAll",()=>{expect(typeof notificationsService.getAll).toBe("function");});});
