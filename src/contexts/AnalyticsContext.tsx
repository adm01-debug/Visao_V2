import React,{createContext,useContext,useState,ReactNode}from"react";
interface AnalyticsContextType{dateRange:{start:Date;end:Date};setDateRange:(r:{start:Date;end:Date})=>void;selectedCameras:string[];setSelectedCameras:(c:string[])=>void}
const AnalyticsContext=createContext<AnalyticsContextType|undefined>(undefined);
export function AnalyticsProvider({children}:{children:ReactNode}){
  const[dateRange,setDateRange]=useState({start:new Date(Date.now()-7*24*60*60*1000),end:new Date()});
  const[selectedCameras,setSelectedCameras]=useState<string[]>([]);
  return<AnalyticsContext.Provider value={{dateRange,setDateRange,selectedCameras,setSelectedCameras}}>{children}</AnalyticsContext.Provider>;
}
export const useAnalytics=()=>{const ctx=useContext(AnalyticsContext);if(!ctx)throw new Error("useAnalytics must be used within AnalyticsProvider");return ctx;};
