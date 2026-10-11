import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_API_URL se API base URL configure hota hai
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
