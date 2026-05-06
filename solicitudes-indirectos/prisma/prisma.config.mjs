import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://usuario:contraseña@localhost:5432/nombre_base",
  },
});
