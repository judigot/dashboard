import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";

const WORKSPACE_ENV =
  process.env.WORKSPACE_ENV_PATH || "/home/ubuntu/workspace/.env";

interface IApp {
  slug: string;
  port: number;
  url: string;
  status: "up" | "down" | "unknown";
}

interface IConfig {
  domain: string;
  opencodeDomain: string;
  apps: IApp[];
}

function parseEnv(): { domain: string; opencodeDomain: string; apps: Array<{ slug: string; port: number }> } {
  const defaults = {
    domain: "judigot.com",
    opencodeDomain: "opencode.judigot.com",
    apps: [] as Array<{ slug: string; port: number }>,
  };

  try {
    const content = readFileSync(WORKSPACE_ENV, "utf-8");
    const vars: Record<string, string> = {};

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) {
        continue;
      }
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) {
        continue;
      }
      const key = trimmed.slice(0, eqIdx);
      let value = trimmed.slice(eqIdx + 1);
      /* Strip surrounding quotes */
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }

    const domain = vars["DOMAIN"] || defaults.domain;
    const opencodeDomain =
      vars["OPENCODE_SUBDOMAIN"] || `opencode.${domain}`;

    const viteApps = vars["VITE_APPS"] || "";
    const apps = viteApps
      .trim()
      .split(/\s+/)
      .filter((entry) => entry.includes(":"))
      .map((entry) => {
        const [slug, portStr] = entry.split(":");
        return { slug, port: Number(portStr) };
      });

    return { domain, opencodeDomain, apps };
  } catch {
    return defaults;
  }
}

function checkPort(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host, timeout: 500 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export const app = new Hono();

app.use("/*", cors());

app.get("/api/apps", async (c) => {
  const { domain, opencodeDomain, apps: rawApps } = parseEnv();

  const apps: IApp[] = await Promise.all(
    rawApps.map(async ({ slug, port }) => {
      const alive = await checkPort(port);
      return {
        slug,
        port,
        url: `https://${domain}/${slug}/`,
        status: alive ? ("up" as const) : ("down" as const),
      };
    }),
  );

  const config: IConfig = { domain, opencodeDomain, apps };
  return c.json(config);
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});
