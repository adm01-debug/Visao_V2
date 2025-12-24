import React,{createContext,useContext,useState,ReactNode}from"react";
import{useQuery}from"@tanstack/react-query";
import{supabase}from"@/integrations/supabase/client";
interface CameraContextType{cameras:Camera[];selectedCamera:Camera|null;setSelectedCamera:(c:Camera|null)=>void;refresh:()=>void}
const CameraContext=createContext<CameraContextType|undefined>(undefined);
export function CameraProvider({children}:{children:ReactNode}){
  const[selectedCamera,setSelectedCamera]=useState<any|null>(null);
  const{data:cameras=[],refetch}=useQuery({queryKey:["cameras"],queryFn:async()=>{const{data}=await supabase.from("cameras").select("*").order("name");return data||[];}});
  return<CameraContext.Provider value={{cameras,selectedCamera,setSelectedCamera,refresh:refetch}}>{children}</CameraContext.Provider>;
}
export const useCameraContext=()=>{const ctx=useContext(CameraContext);if(!ctx)throw new Error("useCameraContext must be used within CameraProvider");return ctx;};
