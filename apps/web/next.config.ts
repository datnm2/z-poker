import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function getLanIp(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return null;
}

const lanIp = getLanIp();
if (lanIp) {
  process.env.NEXT_PUBLIC_LAN_ORIGIN = `http://${lanIp}:3030`;
  console.log(`[next.config] LAN origin: ${process.env.NEXT_PUBLIC_LAN_ORIGIN}`);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanIp ? [lanIp] : [],
};

export default nextConfig;
