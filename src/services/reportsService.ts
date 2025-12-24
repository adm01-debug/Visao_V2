import{supabase}from"@/integrations/supabase/client";
export const reportsService={
  async getAlertsSummary(startDate:string,endDate:string){const{data,error}=await supabase.from("alerts").select("*").gte("created_at",startDate).lte("created_at",endDate);if(error)throw error;return data;},
  async getCameraStats(){const{data,error}=await supabase.from("cameras").select("id,name,status");if(error)throw error;return data;},
  async getRecognitionStats(startDate:string,endDate:string){const{data,error}=await supabase.from("recognition_logs").select("*").gte("created_at",startDate).lte("created_at",endDate);if(error)throw error;return data;},
  async exportReport(type:string,data:any){return{type,data,exportedAt:new Date().toISOString()};}
};
