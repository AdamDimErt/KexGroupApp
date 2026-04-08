# Project Stop

When the user says "проект стоп" or invokes /project-stop:

1. **Commit all changes:**
   - Run `git status` to see changes
   - Stage all modified/new source files (exclude .env, secrets, node_modules)
   - Create a descriptive commit with summary of what was done

2. **Stop all running services:**
   - Find processes on ports: 3000 (api-gateway), 3001 (auth-service), 3002 (finance-service), 3003 (aggregator-worker), 5173 (web-dashboard), 8081 (mobile-dashboard)
   - Kill all found processes with `taskkill //PID <pid> //F`
   - Verify all ports are free

3. **Report summary:**
   - What was committed
   - What processes were stopped
   - Current project state
