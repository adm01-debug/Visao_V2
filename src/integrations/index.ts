/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Integrations barrel export - Exportação centralizada de todas as integrações
 *
 * @module integrations
 */

// Supabase integration
export * from "./supabase/client";
export * from "./supabase/types";

// External integrations
export * from "./anthropic";
export * from "./aws";
export * from "./azure";
export * from "./bitrix24Integration";
export * from "./discord";
export * from "./email";
export * from "./ffmpeg";
export * from "./firebase";
export * from "./gcp";
export * from "./google-calendar";
// ./gstreamer does not exist – removed
export * from "./mercadopago";
export * from "./microsoft-graph";
export * from "./openai";
export * from "./s3";
// ./slack does not exist – removed
export * from "./sms";
export * from "./stripe";
export * from "./twitch";
export * from "./webrtc";
export * from "./whatsapp";
export * from "./youtube";
export * from "./zoom";
