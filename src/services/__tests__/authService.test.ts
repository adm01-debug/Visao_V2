import{describe,it,expect,vi}from"vitest";import{authService}from"../authService";
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{signInWithPassword:vi.fn(),signUp:vi.fn(),signOut:vi.fn(),getSession:vi.fn(),getUser:vi.fn()}}}));
describe("authService",()=>{it("has signIn",()=>{expect(typeof authService.signIn).toBe("function");});it("has signOut",()=>{expect(typeof authService.signOut).toBe("function");});});
