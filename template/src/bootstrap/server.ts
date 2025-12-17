import { AppServiceProvider } from "@/app/Providers/AppServiceProvider";
import apiRoutes from "@/routes/api";
import webRoutes from "@/routes/web";
import { ArcanaJSServer } from "arcanajs/server";

const PORT = process.env.PORT || 3000;

const server = new ArcanaJSServer({
  port: Number(PORT),
  routes: webRoutes,
  apiRoutes: apiRoutes,
  apiBase: "/api",
  autoDiscovery: {
    enabled: true,
    debug: false, // Optional: enable debug logging
  },
  providers: [AppServiceProvider],
});

server.start();
