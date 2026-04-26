# ReachDem Evolution API VPS Setup

This folder contains the minimum infrastructure needed to run Evolution API v2
for ReachDem on a dedicated VPS.

## Stack

- `evolution-api`
- `postgres`
- `redis`
- `caddy`

This setup keeps Evolution isolated from the main ReachDem database and worker
runtime.

## 1. Provision the VPS

Recommended baseline:

- Ubuntu 22.04 or 24.04
- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- public DNS entry, for example `wa-api.your-domain.com`

## 2. Install Docker and Compose

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg ufw
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

## 3. Configure the firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 4. Prepare the deployment directory

```bash
mkdir -p ~/reachdem-evolution
cd ~/reachdem-evolution
mkdir -p postgres-data redis-data caddy-data caddy-config
```

Copy these files into the VPS deployment directory:

- `docker-compose.yml`
- `.env.example`
- `Caddyfile`

Then create the real `.env`:

```bash
cp .env.example .env
```

## 5. Set the environment

Edit `.env` with real values:

```env
EVOLUTION_PUBLIC_BASE_URL=https://wa-api.example.com
EVOLUTION_LOCAL_PORT=8080
EVOLUTION_API_KEY=change-me-long-random-secret
EVOLUTION_LOG_LEVEL=ERROR

POSTGRES_DB=evolution
POSTGRES_USER=evolution
POSTGRES_PASSWORD=change-me-strong-db-password
```

Set the hostname for Caddy when starting the stack:

```bash
export EVOLUTION_HOSTNAME=wa-api.example.com
```

## 6. Start the stack

```bash
docker compose up -d
docker compose ps
docker compose logs -f evolution
```

Healthy signs:

- `postgres` is healthy
- `redis` is healthy
- `evolution` stays up
- `caddy` obtains certificates and proxies traffic

## 7. ReachDem app configuration

Set these in ReachDem:

```env
EVOLUTION_ENABLED=true
EVOLUTION_API_BASE_URL=https://wa-api.example.com
EVOLUTION_API_KEY=change-me-long-random-secret
EVOLUTION_WEBHOOK_SECRET=change-me-webhook-secret
EVOLUTION_INSTANCE_PREFIX=prod-reachdem-org
PAYMENT_WHATSAPP_UNIT_AMOUNT_MINOR=0
```

## 8. First validation steps

Run these in order:

1. Call `POST /api/v1/whatsapp/session` from ReachDem for a test workspace
2. Confirm a session row is created in ReachDem
3. Confirm Evolution instance is created
4. Confirm a QR or pairing code is returned
5. Pair the WhatsApp account
6. Send one WhatsApp message from ReachDem
7. Confirm webhook hits `POST /api/webhooks/evolution`
8. Confirm ReachDem updates session/message state
9. Launch a one-recipient WhatsApp campaign

## 9. Operations notes

- Keep Evolution on its own VPS or isolated host
- Do not share the main ReachDem PostgreSQL with Evolution
- Back up `postgres-data`
- Monitor container restarts
- Use a strong `EVOLUTION_API_KEY`
- Rotate webhook and API keys if exposed

## 10. GitHub Actions configuration

The CI/CD workflows expect these GitHub environment values:

Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VERCEL_TOKEN`
- `EVOLUTION_WEBHOOK_SECRET`

Repository or environment variables:

- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_WEB`
- `STAGING_WORKER_URL`
- `STAGING_APP_URL`
- `PRODUCTION_WORKER_URL`
- `PRODUCTION_APP_URL`

Before enabling staging/production deploys, also verify:

- `apps/workers/wrangler.jsonc` has the correct `API_BASE_URL` per environment
- the Cloudflare queues for `staging` and `production` already exist
- the Vercel project is linked to `apps/web`

## 11. Rollback procedure

If a new Evolution release causes regressions, roll back in this order:

1. Update `docker-compose.yml` to the last known-good image tag
2. Pull the previous image:

```bash
docker compose pull evolution
```

3. Restart the stack:

```bash
docker compose up -d
```

4. Verify recovery:

- `docker compose ps`
- `docker compose logs --tail=200 evolution`
- open the ReachDem WhatsApp session endpoint
- send one controlled WhatsApp test message

Recommended practice:

- never deploy `latest`
- keep the previously working image tag in the release notes
- use additive Prisma/database changes only
- if ReachDem web/worker was deployed in the same release, redeploy the previous stable app/worker version too

## 12. What this setup deliberately avoids

- no RabbitMQ/SQS/NATS
- no WebSocket dependency for ReachDem
- no global webhook mode
- no extra chatbot integrations

This keeps the deployment focused on the ReachDem WhatsApp transport use case.
