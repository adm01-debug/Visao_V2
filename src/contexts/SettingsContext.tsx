import React,{createContext,useContext,useState,useEffect,ReactNode}from"react";
interface Settings{notifications:boolean;sound:boolean;language:string;timezone:string}
interface SettingsContextType{settings:Settings;updateSettings:(s:Partial<Settings>)=>void}
const defaultSettings:Settings={notifications:true,sound:true,language:"pt-BR",timezone:"America/Sao_Paulo"};
const SettingsContext=createContext<SettingsContextType|undefined>(undefined);
export function SettingsProvider({children}:{children:ReactNode}){
  const[settings,setSettings]=useState<Settings>(()=>{const stored=localStorage.getItem("visao_settings");return stored?JSON.parse(stored):defaultSettings;});
  useEffect(()=>{localStorage.setItem("visao_settings",JSON.stringify(settings));},[settings]);
  const updateSettings=(s:Partial<Settings>)=>setSettings(prev=>({...prev,...s}));
  return<SettingsContext.Provider value={{settings,updateSettings}}>{children}</SettingsContext.Provider>;
}
export const useSettings=()=>{const ctx=useContext(SettingsContext);if(!ctx)throw new Error("useSettings must be used within SettingsProvider");return ctx;};
