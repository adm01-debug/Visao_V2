import base from "./playwright.config";

const cfg: any = { ...(base as any) };
delete cfg.webServer;
cfg.use = { ...(base as any).use, baseURL: "http://localhost:8080", storageState: undefined };
export default cfg;
