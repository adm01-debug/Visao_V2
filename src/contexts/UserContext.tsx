import React,{createContext,useContext,useState,useEffect,ReactNode}from"react";
import{supabase}from"@/integrations/supabase/client";
interface User{id:string;email:string;role:string}
interface UserContextType{user:User|null;loading:boolean;logout:()=>Promise<void>}
const UserContext=createContext<UserContextType|undefined>(undefined);
export function UserProvider({children}:{children:ReactNode}){
  const[user,setUser]=useState<User|null>(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session?.user){setUser({id:data.session.user.id,email:data.session.user.email||"",role:"user"});}setLoading(false);});const{data:{subscription}}=supabase.auth.onAuthStateChange((e,s)=>{if(s?.user){setUser({id:s.user.id,email:s.user.email||"",role:"user"});}else{setUser(null);}});return()=>subscription.unsubscribe();},[]);
  const logout=async()=>{await supabase.auth.signOut();setUser(null);};
  return<UserContext.Provider value={{user,loading,logout}}>{children}</UserContext.Provider>;
}
export const useUser=()=>{const ctx=useContext(UserContext);if(!ctx)throw new Error("useUser must be used within UserProvider");return ctx;};
