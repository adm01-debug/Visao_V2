# 🚀 API Quick Start

## Autenticação

```typescript
import { supabase } from "@/integrations/supabase/client";

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password"
});

// Logout
await supabase.auth.signOut();
```

## Câmeras

```typescript
// Listar câmeras
const { data: cameras } = await supabase
  .from("cameras")
  .select("*")
  .order("name");

// Criar câmera
const { data } = await supabase
  .from("cameras")
  .insert({ name: "Cam 1", url: "rtsp://..." })
  .select()
  .single();

// Atualizar
await supabase
  .from("cameras")
  .update({ status: "active" })
  .eq("id", cameraId);
```

## Alertas

```typescript
// Listar alertas
const { data: alerts } = await supabase
  .from("alerts")
  .select("*, camera:cameras(*)")
  .order("created_at", { ascending: false });

// Marcar como lido
await supabase
  .from("alerts")
  .update({ read: true })
  .eq("id", alertId);
```

## Pessoas

```typescript
// Cadastrar pessoa
const { data } = await supabase
  .from("known_faces")
  .insert({
    name: "João Silva",
    face_encoding: faceVector,
    group: "employees"
  })
  .select()
  .single();
```

## Zonas

```typescript
// Criar zona
const { data } = await supabase
  .from("zones")
  .insert({
    camera_id: cameraId,
    name: "Entrada",
    coordinates: [[0,0], [100,0], [100,100], [0,100]],
    type: "detection"
  })
  .select()
  .single();
```

## Real-time

```typescript
// Escutar alertas em tempo real
supabase
  .channel("alerts")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "alerts"
  }, (payload) => {
    console.log("Novo alerta:", payload.new);
  })
  .subscribe();
```

---

*Atualizado em 10/01/2026*

