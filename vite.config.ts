import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // Electron: Use relative paths for assets (required for file:// protocol)
  // This works for both Electron and web deployments
  base: './',
  build: {
    // Ensure assets are properly resolved in Electron
    outDir: 'dist',
    assetsDir: 'assets',
    // Generate relative paths for Electron compatibility
    rollupOptions: {
      output: {
        // Ensure consistent asset paths
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
