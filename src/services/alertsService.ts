import{supabase}from"@/integrations/supabase/client";
export const alertsService={
  async getAll(){const{data,error}=await supabase.from("alerts").select("*").order("created_at",{ascending:false});if(error)throw error;return data;},
  async getById(id:string){const{data,error}=await supabase.from("alerts").select("*").eq("id",id).single();if(error)throw error;return data;},
  async create(alert:any){const{data,error}=await supabase.from("alerts").insert(alert).select().single();if(error)throw error;return data;},
  async update(id:string,alert:any){const{data,error}=await supabase.from("alerts").update(alert).eq("id",id).select().single();if(error)throw error;return data;},
  async delete(id:string){const{error}=await supabase.from("alerts").delete().eq("id",id);if(error)throw error;},
  async markAsRead(id:string){return this.update(id,{read:true});},
  async getUnreadCount(){const{count,error}=await supabase.from("alerts").select("*",{count:"exact",head:true}).eq("read",false);if(error)throw error;return count||0;}
};
