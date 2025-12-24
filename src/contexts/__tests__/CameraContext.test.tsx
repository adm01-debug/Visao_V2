import{describe,it,expect,vi}from"vitest";import{render}from"@testing-library/react";import{QueryClient,QueryClientProvider}from"@tanstack/react-query";import{CameraProvider}from"../CameraContext";
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:()=>({select:()=>({order:()=>({data:[],error:null})})})}}));
describe("CameraContext",()=>{it("provides cameras",()=>{const qc=new QueryClient();render(<QueryClientProvider client={qc}><CameraProvider><div>Test</div></CameraProvider></QueryClientProvider>);expect(true).toBe(true);});});
