#!/bin/sh
# start|stop the Summit server using a pidfile (avoids pkill matching this shell)
PID=/tmp/summit-server.pid
LOG=${SUMMIT_LOG:-/tmp/summit-server.log}
case "$1" in
  stop) [ -f $PID ] && kill "$(cat $PID)" 2>/dev/null; rm -f $PID; echo stopped ;;
  start) nohup node server/index.js > "$LOG" 2>&1 & echo $! > $PID; sleep 1.2; echo "started $(cat $PID)" ;;
  restart) $0 stop; sleep 0.4; $0 start ;;
esac
