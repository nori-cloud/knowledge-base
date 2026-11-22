---
title: "Postgres WAL Disk Exhaustion: Authentik Outage Journal"
description: "A stuck replication slot filled the Authentik database volumes and took Authentik down. What happened, how we recovered, and what to do next time."
---

## What am I looking at?

This is the record of one incident and a runbook for the next one. A replica fell out of sync, its replication slot kept every WAL file on disk, and two of three database volumes filled up. PostgreSQL stopped, so Authentik stopped.

The data itself was small (about 111MB). Almost the whole 8Gi volume was WAL.

- **Date**: November 17–22, 2026
- **Affected**: `authentik-db` (CloudNativePG, 3 instances, 8Gi volumes)
- **Impact**: Authentik server and workers crash-looped for almost four days
- **Fix**: [PR #28](https://github.com/nori-cloud/infra/pull/28)

Jump to a section:

- [What happened?](#what-happened)
- [What was the root cause?](#what-was-the-root-cause)
- [How do I tell it is happening?](#how-do-i-tell-it-is-happening)
- [How do I recover?](#how-do-i-recover)
- [What did we change to prevent it?](#what-did-we-change-to-prevent-it)
- [How do I test that alerts reach Discord?](#how-do-i-test-that-alerts-reach-discord)
- [What is still open?](#what-is-still-open)
- [Lessons](#lessons)

---

## What happened?

All times are UTC and approximate.

| When | What |
| --- | --- |
| 17 Nov 00:28 | `authentik-db-1` becomes primary after a failover. |
| 17 Nov ~01:00 | `authentik-db-3` cannot follow the new timeline. Its replication slot stops moving, and WAL starts piling up at about 190MB per hour. |
| 18 Nov ~17:22 | The last WAL file is archived. The volumes are full. |
| 18 Nov 17:27 | The cluster goes `Not enough disk space`. Authentik crash-loops. |
| 19 Nov 02:00 | The nightly backup fails because the primary is down. |
| 22 Nov | Investigation, recovery, and the fixes below. |

Pod alerts did fire for days, but nobody saw them. See [Why did nobody notice?](#why-did-nobody-notice).

---

## What was the root cause?

**A diverged replica left a stuck replication slot.**

`authentik-db-3` was ahead of the new primary on the old timeline, so it could not rejoin (`requested timeline 12 does not contain minimum recovery point 66/3B000000 on timeline 11`). The primary kept a replication slot for it. A slot tells Postgres to keep every WAL file the replica has not read yet. The replica never read anything, so nothing was ever released.

CloudNativePG copies these slots to the other replica, so `authentik-db-2` held the same WAL. Both volumes filled at the same rate.

There was no `max_slot_wal_keep_size`, which is the setting that lets Postgres give up on a slot instead of filling the disk.

Backups were not the cause. WAL archiving to S3 worked until the disk was full. The failed backup was a symptom.

### Why did nobody notice?

Three things were wrong at once:

1. **No Postgres alerts.** Nothing watched volumes, WAL, or slots.
2. **Routing dropped alerts.** The Discord route only matched `namespace="monitoring"`. The Prometheus operator adds that match by default to a config in its own namespace. Alerts from every other namespace went to a receiver that discards them.
3. **The Discord webhook was invalid.** Discord answered `404 Unknown Webhook`. About 1,161 of 1,164 notifications had failed over 92 days. Almost nothing had ever arrived.

---

## How do I tell it is happening?

Look for these signs, roughly in order of how early they appear:

- Alert `PostgresReplicationSlotRetainingWAL` or `PostgresVolumeFillingSoon` (added by this fix).
- The cluster phase says `Not enough disk space`:

  ```bash
  kubectl get cluster.postgresql.cnpg.io -A
  ```

- The primary logs `no free disk space for WALs`.
- Volume usage climbs in a straight line while the real data stays small.

To confirm it is WAL and find the stuck slot:

```bash
# size of WAL versus data (use -c postgres; the barman sidecar has no shell)
kubectl exec <pod> -n <ns> -c postgres -- sh -c 'du -sh $PGDATA/pg_wal; du -sh $PGDATA/base'

# slots: an inactive slot with a big backlog is the culprit
kubectl exec <pod> -n <ns> -c postgres -- psql -U postgres -At \
  -c "select slot_name, active, wal_status from pg_replication_slots"
```

Check the broken replica's logs for the reason it fell behind. Here it was a timeline mismatch.

---

## How do I recover?

### 1. Grow every volume by hand

CloudNativePG will not do this for you when a disk is full. Each reconcile loop first checks for a pod without WAL space, sets the phase to `Not enough disk space`, and returns before the step that resizes volumes. The operator waits for the volumes to grow, but cannot grow them.

Patch each PVC to the new size. The storage class must allow expansion (`freenas-iscsi` does):

```bash
kubectl patch pvc <instance-pvc> -n <ns> --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"12Gi"}}}}'
```

Do this for every instance, then set the same size in the Cluster spec in `infra` so Git matches. Volumes can only grow, never shrink.

### 2. Let the primary start and shed the slot

Once the primary has room it starts. With `max_slot_wal_keep_size` set, the stuck slot goes to `wal_status = lost` and Postgres frees the WAL. In this incident the primary dropped from about 7.7GB to 593MB.

### 3. Rebuild the diverged replica

A replica that cannot follow the timeline must be rebuilt. This deletes only a copy of the data. Make sure the primary and at least one other instance are healthy first:

```bash
kubectl delete pvc <replica-pvc> -n <ns> --wait=false
kubectl delete pod <replica-pod> -n <ns> --wait=false
```

CloudNativePG creates a join job and clones the replica from the primary. This took about two minutes for a 600MB database.

### 4. Verify

- The cluster reports `Cluster in healthy state` with all instances ready.
- Replicas show `streaming` with zero lag, and every slot is active.
- `pg_wal` is small on every instance.
- Run a manual backup and confirm it completes.

### Things to avoid

- Do not delete the primary's PVC.
- Do not delete WAL files by hand to free space.
- Do not treat a full disk as a backup problem until you have checked the slots.

---

## What did we change to prevent it?

### Authentik database

- Volumes grew from 8Gi to 12Gi.
- `max_slot_wal_keep_size: 4GB`. At 190MB per hour, a dead replica is cut off after about 21 hours, well before the disk fills.

### Alerts

| Alert | Fires when | Severity |
| --- | --- | --- |
| `PostgresVolumeFillingSoon` | A database volume is on track to fill within 72 hours, for 2 hours | warning |
| `PostgresVolumeLowSpace` | Under 30% free, for 1 hour | warning |
| `PostgresVolumeAlmostFull` | Under 10% free, for 10 minutes | critical |
| `PostgresReplicationSlotRetainingWAL` | An inactive slot on a primary holds over 256MB, for 30 minutes | warning |
| `PostgresWALArchivingFailing` | WAL archiving has failed more recently than it succeeded, for 1 hour | warning |

Replayed against this incident, the slot alert fires about 39 hours before the disk filled. The whole run from stuck slot to full disk was only about 40 hours, so no alert could give 48 hours' notice on this exact failure. The slot cap is what removes the risk.

### Alert routing

`alertmanagerConfigMatcherStrategy: None` makes the Discord route apply to every namespace. The always-firing `Watchdog` and `InfoInhibitor` alerts are excluded so they do not spam the channel.

### Discord webhook

The webhook is stored in Infisical (project `infra-4vm-m`, environment `prod`, path `/monitoring`, key `DISCORD_ALERT_CHANNEL`) and synced by an ExternalSecret every hour. After changing it, force a sync:

```bash
kubectl annotate externalsecret discord-alert-channel -n monitoring \
  force-sync=$(date +%s) --overwrite
```

---

## How do I test that alerts reach Discord?

Two checks, from least to most intrusive.

**Read-only:** Alertmanager shows which receiver each live alert goes to. An alert routed to `null` is being dropped.

**Send a test alert:** post a short-lived alert to the Alertmanager API through a local `kubectl proxy`. Use a namespace other than `monitoring` to prove the routing fix. It expires on its own and posts a resolved message. Watch `alertmanager_notifications_failed_total{integration="discord"}` on the Alertmanager pods: a rising failure count with `404 Unknown Webhook` in the logs means the webhook is invalid.

---

## What is still open?

- **Other clusters have no slot cap.** `argus-db`, `temporal-postgres`, both `nori-cloud-pg-cluster` instances, and `norriswu0-db` are single-instance, so they have no replica slot today. Add `max_slot_wal_keep_size` (about 40% of the volume) before any of them gains a replica.
- **No backup-age alert.** CloudNativePG's backup metric reads 0 for backups made through the barman plugin, so an alert on it would be wrong. Find another signal.
- **WAL archiving failures are not covered by the slot cap.** If archiving to S3 fails, WAL still accumulates. The `PostgresWALArchivingFailing` and volume alerts are the protection.
- **Why did the failover happen?** We know `db-3` diverged. We have not established what triggered the failover on 17 Nov.

---

## Lessons

1. **A full disk is not always your data.** Check `pg_wal` and the replication slots first.
2. **Always cap slot retention.** A single dead replica should never be able to take down the primary.
3. **Test the whole alert path, end to end.** Rules, routing, and the delivery channel each failed on their own, and each hid the others.
4. **CloudNativePG deadlocks on a full disk.** Grow the PVCs manually.

---

## Is there any external references to this documentation?

- [PR #28: the fix](https://github.com/nori-cloud/infra/pull/28) — volumes, slot cap, alerts, and routing.
- [PostgreSQL: `max_slot_wal_keep_size`](https://www.postgresql.org/docs/current/runtime-config-replication.html#GUC-MAX-SLOT-WAL-KEEP-SIZE) — the setting that caps WAL kept for a slot.
- [CloudNativePG source](https://github.com/cloudnative-pg/cloudnative-pg) — `ensureNoFailoverOnFullDisk` in `internal/controller/cluster_controller.go` explains the resize deadlock.
