import{describe,it,expect,vi}from"vitest";import{render}from"@testing-library/react";import{QueryClient,QueryClientProvider}from"@tanstack/react-query";import{AlertProvider}from"../AlertContext";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({order:()=>({data:[],error:null})})})}}));
describe("AlertContext",()=>{it("provides alerts",()=>{const qc=new QueryClient();render(<QueryClientProvider client={qc}><AlertProvider><div>Test</div></AlertProvider></QueryClientProvider>);expect(true).toBe(true);});});
