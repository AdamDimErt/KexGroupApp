# KEX GROUP — Production Server Operations

## Server Credentials

| Параметр | Значение |
|----------|----------|
| IP | `93.183.73.143` |
| Логин | `root` |
| SSH-ключ | `C:\Users\Acer\Downloads\id_rsa.pem` |
| Хостинг | AliPush (Москва, Ubuntu 24.04, 4 vCPU / 8 GB RAM) |
| Корень проекта | `/opt/kex` |
| Логи сервисов | `/var/log/kex/*.log` |
| Backup предыдущего dist | `/opt/kex-backup/dist-prev/` |

## Service Ports

| Сервис | Порт | Путь .env |
|--------|------|-----------|
| api-gateway | 3000 | `/opt/kex/apps/api-gateway/.env` |
| auth-service | 3001 | `/opt/kex/apps/auth-service/.env` |
| finance-service | 3002 | `/opt/kex/apps/finance-service/.env` |
| aggregator-worker | 3003 | `/opt/kex/apps/aggregator-worker/.env` |
| Metro (mobile) | 8081 | `/opt/kex/apps/mobile-dashboard/.env` |
| Общий root .env | — | `/opt/kex/.env` |

## Access

### SSH (PowerShell)
```powershell
ssh -i "C:\Users\Acer\Downloads\id_rsa.pem" root@93.183.73.143
```

### Web Console
В кабинете AliPush у сервера — кнопка **Web консоль** (вверху справа). Открывает терминал в браузере без SSH-ключа.

## Deploy .env files (PowerShell)

### Один файл (примеры)
```powershell
# Корневой .env
scp -i "C:\Users\Acer\Downloads\id_rsa.pem" `
  "C:\Users\Acer\Downloads\kex-env-backup\.env" `
  root@93.183.73.143:/opt/kex/.env

# auth-service .env (DEV_BYPASS_PHONES живут здесь)
scp -i "C:\Users\Acer\Downloads\id_rsa.pem" `
  "C:\Users\Acer\Downloads\kex-env-backup\apps\auth-service\.env" `
  root@93.183.73.143:/opt/kex/apps/auth-service/.env

# aggregator-worker .env (iiko credentials)
scp -i "C:\Users\Acer\Downloads\id_rsa.pem" `
  "C:\Users\Acer\Downloads\kex-env-backup\apps\aggregator-worker\.env" `
  root@93.183.73.143:/opt/kex/apps/aggregator-worker/.env
```

### Все .env одной командой
```powershell
$KEY = "C:\Users\Acer\Downloads\id_rsa.pem"
$SRC = "C:\Users\Acer\Downloads\kex-env-backup"
$SRV = "root@93.183.73.143"

scp -i $KEY "$SRC\.env"                              "${SRV}:/opt/kex/.env"
scp -i $KEY "$SRC\apps\api-gateway\.env"             "${SRV}:/opt/kex/apps/api-gateway/.env"
scp -i $KEY "$SRC\apps\auth-service\.env"            "${SRV}:/opt/kex/apps/auth-service/.env"
scp -i $KEY "$SRC\apps\finance-service\.env"         "${SRV}:/opt/kex/apps/finance-service/.env"
scp -i $KEY "$SRC\apps\aggregator-worker\.env"       "${SRV}:/opt/kex/apps/aggregator-worker/.env"
scp -i $KEY "$SRC\apps\mobile-dashboard\.env"        "${SRV}:/opt/kex/apps/mobile-dashboard/.env"
```

## Restart Service

### Какой .env поменял → какой сервис рестартить

| Изменил .env | Рестартить |
|--------------|------------|
| `apps/api-gateway/.env` | gateway (порт 3000) |
| `apps/auth-service/.env` | auth (порт 3001) |
| `apps/finance-service/.env` | finance (порт 3002) |
| `apps/aggregator-worker/.env` | worker (порт 3003) |
| `apps/mobile-dashboard/.env` | Metro (порт 8081) + тестерам перезагрузить app |
| `/opt/kex/.env` (общий) | все 4 backend + worker |

### Шаблон рестарта (auth-service на 3001)
```powershell
ssh -i "C:\Users\Acer\Downloads\id_rsa.pem" root@93.183.73.143 @"
fuser -k 3001/tcp 2>/dev/null
sleep 3
cd /opt/kex/apps/auth-service
export `$(grep -v '^#' .env | xargs)
setsid bash -c 'node --enable-source-maps dist/main >> /var/log/kex/auth-service.log 2>&1' </dev/null &
echo restarted PID=`$!
"@
```
> Заменить `3001` и `auth-service` на нужный порт/сервис.

## Health Checks

```powershell
# API Gateway
curl http://93.183.73.143:3000/api/health

# Metro
curl http://93.183.73.143:8081/status

# Логи
ssh -i "C:\Users\Acer\Downloads\id_rsa.pem" root@93.183.73.143 "tail -30 /var/log/kex/auth-service.log"
```

## Rollback

Полный backup предыдущего dist всех сервисов лежит на сервере: `/opt/kex-backup/dist-prev/`.

```powershell
ssh -i "C:\Users\Acer\Downloads\id_rsa.pem" root@93.183.73.143 @"
cp -r /opt/kex-backup/dist-prev/auth-service/dist /opt/kex/apps/auth-service/
cp -r /opt/kex-backup/dist-prev/finance-service/dist /opt/kex/apps/finance-service/
cp -r /opt/kex-backup/dist-prev/api-gateway/dist /opt/kex/apps/api-gateway/
cp -r /opt/kex-backup/dist-prev/aggregator-worker/dist /opt/kex/apps/aggregator-worker/
fuser -k 3000/tcp 3001/tcp 3002/tcp 3003/tcp
# затем заново стартовать каждый сервис (см. блок Restart Service выше)
"@
```
