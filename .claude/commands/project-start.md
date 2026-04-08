# Project Start

When the user says "проект старт" or invokes /project-start:

1. **Start all services in order:**
   - Check which ports are already occupied (3000, 3001, 3002, 3003, 5173, 8081)
   - Start each free service in background:
     - auth-service (port 3001): `cd D:/kexgroupapp/apps/auth-service && npm run dev`
     - finance-service (port 3002): `cd D:/kexgroupapp/apps/finance-service && npm run dev`
     - api-gateway (port 3000): `cd D:/kexgroupapp/apps/api-gateway && npm run dev`
     - aggregator-worker (port 3003): `cd D:/kexgroupapp/apps/aggregator-worker && npm run dev`
     - web-dashboard (port 5173): `cd D:/kexgroupapp/apps/web-dashboard && npm run dev`
     - mobile-dashboard (port 8081): `cd D:/kexgroupapp/apps/mobile-dashboard && npx expo start --web --port 8081`

2. **Wait and verify health:**
   - Wait 10-15 seconds for services to start
   - Check health endpoints: /health on each backend port
   - Report which services are up

3. **Report summary:**
   - List all running services with their ports
   - Note any failures
