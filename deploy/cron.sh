#!/bin/sh
umask 077
# crond doesn't pass the container's environment to jobs, so save the two values the jobs need.
{
  echo "export PGPASSWORD='$PGPASSWORD'"
  echo "export CRON_SECRET='$CRON_SECRET'"
} > /etc/cron.env
chmod 600 /etc/cron.env
mkdir -p /backups
exec crond -f -l 8
