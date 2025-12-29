/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Auth Service - Serviço de autenticação
 * 
 * @module services/authService
 */

import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthResponse } from "@supabase/supabase-js";

// ============================================
// TIPOS
// ============================================

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends SignInCredentials {
  fullName?: string;
  phone?: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

// ============================================
// SERVICE
// ============================================

export const authService = {
  /**
   * Login com email e senha
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Cadastro de novo usuário
   */
  async signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (error) throw error;
    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Logout
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Obter sessão atual
   */
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Obter usuário atual
   */
  async getUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Solicitar reset de senha
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  /**
   * Atualizar senha
   */
  async updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  /**
   * Atualizar dados do usuário
   */
  async updateUser(data: { email?: string; phone?: string; data?: Record<string, unknown> }): Promise<User | null> {
    const { data: result, error } = await supabase.auth.updateUser(data);
    if (error) throw error;
    return result.user;
  },

  /**
   * Verificar se usuário está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },

  /**
   * Renovar token
   */
  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Login com OAuth (Google, GitHub, etc)
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'azure'): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  },
};

export default authService;
