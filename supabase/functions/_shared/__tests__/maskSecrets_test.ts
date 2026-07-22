import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { maskSecrets, maskString } from "../maskSecrets.ts";

Deno.test("maskString oculta user:pass em URL RTSP", () => {
  const s = "rtsp://admin:Secret1!@cam.local:554/live";
  assertEquals(maskString(s), "rtsp://***:***@cam.local:554/live");
});

Deno.test("maskString mantém URL sem credenciais", () => {
  assertEquals(maskString("http://public/live"), "http://public/live");
});

Deno.test("maskSecrets percorre objeto e array", () => {
  const obj = {
    level: "info",
    urls: ["rtsp://u:p@h/1", "http://open/2"],
    meta: { primary: "rtsps://a:b@x/y" },
  };
  const out = JSON.stringify(maskSecrets(obj));
  assert(!out.includes(":p@"));
  assert(!out.includes(":b@"));
  assert(out.includes("://***:***@"));
});

Deno.test("maskSecrets é null-safe", () => {
  assertEquals(maskSecrets(null), null);
  assertEquals(maskSecrets(undefined), undefined);
});
