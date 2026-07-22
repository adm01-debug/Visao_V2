// Wave Fortress 3 — helper documental.
// A URL rehidratada do cofre é acessível APENAS por workers internos (service_role).
// O cliente browser NUNCA deve invocar `resolve-camera-url`.
// Este módulo existe para explicitar o contrato e falhar cedo em uso indevido.

export function resolveCameraStreamUrl(): never {
  throw new Error(
    "resolve-camera-url é service_role only. Streams no browser devem usar hls_url/substream_url públicos."
  );
}
