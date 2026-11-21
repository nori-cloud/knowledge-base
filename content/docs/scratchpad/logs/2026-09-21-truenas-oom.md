---

title: "TrueNAS OOM — 2026-09-20 / 2026-09-21"
description: "A record of a TrueNAS SCALE outage caused by out-of-memory (OOM) kills that took down the Web UI, SSH, NFS, and API — and with them, Grafana's NFS-backed..."
---

## What am I looking at?

A record of a TrueNAS SCALE outage caused by out-of-memory (OOM) kills that took
down the Web UI, SSH, NFS, and API — and with them, Grafana's NFS-backed storage.

## What happened?

TrueNAS SCALE `25.10.1` (Proxmox VM, 4 cores, 8 GiB RAM, no swap) became
unresponsive twice. The kernel OOM killer ran on 2026-09-20 10:01 and
2026-09-21 04:01, killing `nginx`, `sshd`, `winbindd`, `syslog-ng`, `rpc.mountd`,
`smbd`, and the iSCSI daemons. `middlewared` survived (`oom_score_adj=-1000`).
There was no panic: orderly shutdown 04:14:52, clean boot 04:15:37.

## How did we find out about it?

Grafana went down first. Its Kubernetes CSI driver (`democratic-csi`) had a hung
NFS `NodeStageVolume`, so we recycled the `democratic-csi-nfs-node` pods and
found the TrueNAS host itself unresponsive (Web UI, SSH, and NFS all down).

After the VM rebooted, we pulled `/var/log/kern.log`, `/var/log/messages`, and
`/var/log/middlewared.log`. The `kern.log` OOM snapshots showed `cli`
(`getty@tty1`) repeatedly killed and respawning, which matched the known
**NAS-141238** console CLI leak in the TrueNAS release notes.

## Why did it run out of memory?

The console CLI process (`getty@tty1`) leaks memory over time and eventually
exhausts system RAM. This is a known TrueNAS bug, **NAS-141238**, fixed in
**25.10.5**.

Evidence from `kern.log` OOM snapshots:

- `cli` (getty@tty1) repeatedly killed and respawning.
- `asyncio_loop` (middlewared) at ~1.4 GiB — a factor, not the trigger.
- ZFS ARC at ~4 GiB — added pressure, not the trigger.

## What caused the NFS hang?

The Grafana CSI `NodeStageVolume` hang matches two upstream fixes:

- **NAS-142112** (25.10.6) — leaked NFSv4 delegation callback stopped `rpc.nfsd` teardown.
- **NAS-142560** (25.10.7) — NFSv4.1 duplicate-request kernel panic.

## What should we do?

- Upgrade to **25.10.7** (fixes the leak and the NFS issues).
- Reissue the Web UI ACME certificate — private key was exposed via `midclt call system.general.config`.
- Remove `norris (ALL) NOPASSWD: ALL`; scope sudo to the `midclt`/`systemctl` calls used.
- Add alerting on memory growth and OOM events.

An ARC cap (`zfs_arc_max=3221225472`) was applied temporarily and then reverted
to auto (`0`) — it was a precaution, not the fix.

## Is there any external references to this documentation?

- [TrueNAS 25.10 version notes](https://www.truenas.com/docs/scale/25.10/gettingstarted/versionnotes/) — source of the NAS-141238 / NAS-142112 / NAS-142560 fixes.
- [NAS-141238](https://ixsystems.atlassian.net/browse/NAS-141238) — console CLI memory leak.
- [NAS-142112](https://ixsystems.atlassian.net/browse/NAS-142112) — NFSv4 delegation callback leak.
- [NAS-142560](https://ixsystems.atlassian.net/browse/NAS-142560) — NFSv4.1 duplicate-request panic.
- [nori-cloud/infra](https://github.com/nori-cloud/infra) — Grafana + democratic-csi NFS/iSCSI config affected by the outage.
