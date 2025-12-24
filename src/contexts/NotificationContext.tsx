import React,{createContext,useContext,useState,useCallback,ReactNode}from"react";
interface Notification{id:string;type:"success"|"error"|"warning"|"info";message:string;duration?:number}
interface NotificationContextType{notifications:Notification[];addNotification:(n:Omit<Notification,"id">)=>void;removeNotification:(id:string)=>void}
const NotificationContext=createContext<NotificationContextType|undefined>(undefined);
export function NotificationProvider({children}:{children:ReactNode}){
  const[notifications,setNotifications]=useState<Notification[]>([]);
  const addNotification=useCallback((n:Omit<Notification,"id">)=>{const id=Math.random().toString(36);setNotifications(prev=>[...prev,{...n,id}]);if(n.duration!==0)setTimeout(()=>removeNotification(id),n.duration||5000);},[]);
  const removeNotification=useCallback((id:string)=>{setNotifications(prev=>prev.filter(n=>n.id!==id));},[]);
  return<NotificationContext.Provider value={{notifications,addNotification,removeNotification}}>{children}</NotificationContext.Provider>;
}
export const useNotifications=()=>{const ctx=useContext(NotificationContext);if(!ctx)throw new Error("useNotifications must be used within NotificationProvider");return ctx;};
