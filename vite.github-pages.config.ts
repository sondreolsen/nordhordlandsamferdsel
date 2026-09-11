import react from "@vitejs/plugin-react";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
 root:"github-pages",
 base:"/nordhordlandsamferdsel/",
 publicDir:"../public",
 cacheDir:process.platform==="win32"?join(tmpdir(),"nordhordland-pages-vite","node_modules",".vite"):undefined,
 plugins:[react()],
 build:{outDir:"../github-pages-dist",emptyOutDir:true},
});
