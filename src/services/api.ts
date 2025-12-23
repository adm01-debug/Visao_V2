// API Service - VISÃO
import { supabase } from "@/integrations/supabase/client";

export const api = {
  async get<T>(table: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return data as T[];
  },

  async getById<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
    if (error) throw error;
    return data as T;
  },

  async create<T>(table: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(item).select().single();
    if (error) throw error;
    return data as T;
  },

  async update<T>(table: string, id: string, item: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).update(item).eq("id", id).select().single();
    if (error) throw error;
    return data as T;
  },

  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
  }
};

