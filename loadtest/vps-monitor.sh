#!/usr/bin/env bash
# Samples VPS health every few seconds while the k6 test runs, writing one CSV row per sample.
# Run it ON THE VPS, in the folder with docker-compose.yml, BEFORE starting k6:
#
#   bash loadtest/vps-monitor.sh 300 2        # 300 seconds, every 2 seconds
#
# Columns: host CPU %, host memory used (MB), load average, api + db container CPU % and
# memory, Postgres connections (total / active), and open TCP connections to the API port.
set -u
DURATION="${1:-300}"
INTERVAL="${2:-2}"
OUT="loadtest/results/vps-$(date +%Y%m%d-%H%M%S).csv"
mkdir -p loadtest/results
[ -f .env ] && set -a && . ./.env && set +a
PGUSER="${POSTGRES_USER:-skrp}"
PGDB="${POSTGRES_DB:-skrp}"

cpu_sample() { awk '/^cpu /{idle=$5+$6; tot=0; for(i=2;i<=NF;i++) tot+=$i; print idle, tot}' /proc/stat; }

echo "ts,host_cpu_pct,host_mem_used_mb,load1,api_cpu_pct,api_mem_mb,db_cpu_pct,db_mem_mb,pg_conns,pg_active,api_tcp_conns" > "$OUT"
echo "writing $OUT for ${DURATION}s (Ctrl+C to stop early)"

read -r prev_idle prev_tot < <(cpu_sample)
end=$((SECONDS + DURATION))
while [ "$SECONDS" -lt "$end" ]; do
  sleep "$INTERVAL"
  read -r idle tot < <(cpu_sample)
  host_cpu=$(awk -v i=$((idle - prev_idle)) -v t=$((tot - prev_tot)) 'BEGIN{ if (t>0) printf "%.1f", (1 - i/t)*100; else print 0 }')
  prev_idle=$idle; prev_tot=$tot
  mem_used=$(free -m | awk '/^Mem:/{print $3}')
  load1=$(cut -d' ' -f1 /proc/loadavg)

  # docker stats prints e.g. "skrp-api-1,12.3%,145.2MiB / 1.9GiB"
  stats=$(docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' 2>/dev/null)
  pick() { echo "$stats" | awk -F, -v n="$1" '$1 ~ n {gsub("%","",$2); split($3,m," "); v=m[1]; gsub("MiB","",v); if (v ~ /GiB/) {gsub("GiB","",v); v=v*1024}; print $2","v; exit}'; }
  api=$(pick "api"); db=$(pick "db")
  pg=$(docker compose exec -T db psql -U "$PGUSER" -d "$PGDB" -At -F, -c \
        "select count(*), count(*) filter (where state='active') from pg_stat_activity where datname='$PGDB'" 2>/dev/null)
  tcp=$(ss -Htn state established '( sport = :4000 or sport = :3000 or sport = :443 )' 2>/dev/null | wc -l)

  echo "$(date +%H:%M:%S),$host_cpu,$mem_used,$load1,${api:-,},${db:-,},${pg:-,},$tcp" | tee -a "$OUT" >/dev/null
done
echo "done: $OUT"
