import{supabase}from"@/integrations/supabase/client";
export const authService={
  async signIn(email:string,password:string){const{data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;return data;},
  async signUp(email:string,password:string){const{data,error}=await supabase.auth.signUp({email,password});if(error)throw error;return data;},
  async signOut(){const{error}=await supabase.auth.signOut();if(error)throw error;},
  async getSession(){const{data,error}=await supabase.auth.getSession();if(error)throw error;return data.session;},
  async getUser(){const{data,error}=await supabase.auth.getUser();if(error)throw error;return data.user;},
  async resetPassword(email:string){const{error}=await supabase.auth.resetPasswordForEmail(email);if(error)throw error;},
  async updatePassword(password:string){const{error}=await supabase.auth.updateUser({password});if(error)throw error;}
};
