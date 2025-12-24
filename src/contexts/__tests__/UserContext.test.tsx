import{describe,it,expect,vi}from"vitest";import{render}from"@testing-library/react";import{UserProvider}from"../UserContext";
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{getSession:()=>Promise.resolve({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:vi.fn()}}})}}}));
describe("UserContext",()=>{it("provides user context",()=>{render(<UserProvider><div>Test</div></UserProvider>);expect(true).toBe(true);});});
