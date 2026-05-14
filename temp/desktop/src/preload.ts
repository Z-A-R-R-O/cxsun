import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("cxnext", {
  platform: "desktop",
});
