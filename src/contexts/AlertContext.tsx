import React,{createContext,useContext,useState,useCallback,ReactNode}from"react";
import{useQuery}from"@tanstack/react-query";
import{supabase}from"@/integrations/supabase/client";
interface AlertContextType{alerts:any[];unreadCount:number;markAsRead:(id:string)=>void;refresh:()=>void}
const AlertContext=createContext<AlertContextType|undefined>(undefined);
export function AlertProvider({children}:{children:ReactNode}){
  const{data:alerts=[],refetch}=useQuery({queryKey:["alerts"],queryFn:async()=>{const{data}=await supabase.from("alerts").select("*").order("created_at",{ascending:false});return data||[];}});
  const unreadCount=alerts.filter((a:any)=>!a.read).length;
  const markAsRead=useCallback(async(id:string)=>{await supabase.from("alerts").update({read:true}).eq("id",id);refetch();},[refetch]);
  return<AlertContext.Provider value={{alerts,unreadCount,markAsRead,refresh:refetch}}>{children}</AlertContext.Provider>;
}
export const useAlertContext=()=>{const ctx=useContext(AlertContext);if(!ctx)throw new Error("useAlertContext must be used within AlertProvider");return ctx;};
