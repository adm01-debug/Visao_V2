import{supabase}from"@/integrations/supabase/client";
export const notificationsService={
  async getAll(){const{data,error}=await supabase.from("notification_config").select("*");if(error)throw error;return data;},
  async update(config:any){const{data,error}=await supabase.from("notification_config").upsert(config).select().single();if(error)throw error;return data;},
  async sendTest(type:string){const{error}=await supabase.functions.invoke("send-alert-notification",{body:{test:true,type}});if(error)throw error;},
  async getSecrets(){const{data,error}=await supabase.from("notification_secrets").select("*");if(error)throw error;return data;},
  async updateSecrets(secrets:any){const{data,error}=await supabase.from("notification_secrets").upsert(secrets).select().single();if(error)throw error;return data;}
};
