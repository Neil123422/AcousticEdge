#!/usr/bin/env node
import { networkInterfaces } from 'os';

function getLanIP() {
  const nets = networkInterfaces();
  // First pass: prefer private LAN ranges
  for (const [, interfaces] of Object.entries(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        // Private ranges: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        if (/^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(ip)) {
          return ip;
        }
      }
    }
  }
  // Fallback: any non-internal IPv4 (excludes link-local 169.254.x.x)
  for (const [, interfaces] of Object.entries(nets)) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const ip = getLanIP();
console.log(ip);