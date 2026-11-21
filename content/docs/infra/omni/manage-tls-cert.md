---

title: Manage Omni TLS certificates
description: How Omni's Tailscale-issued TLS certificate renews and how to check or recover renewal.
---

## What am I looking at?

Omni uses a Tailscale-issued Let's Encrypt certificate for `omni.hoki-sole.ts.net`. A systemd timer checks it daily and renews it when it has 30 days or less remaining. Renewal restarts Omni and Dex so they load the new certificate.

## Where are the certificate and renewal files?

On the Omni VM:

- Certificate: `/root/git/infra/sidero/omni/tls/tls.cert`
- Private key: `/root/git/infra/sidero/omni/tls/tls.key`
- Renewal script: `/usr/local/sbin/renew-omni-cert`
- systemd service: `omni-cert-renew.service`
- systemd timer: `omni-cert-renew.timer`

The key is owned by `root:1001` with mode `640`, so the Dex container can read it without making it world-readable. Keep these permissions when replacing the key.

## How does automatic renewal work?

The timer runs daily at about 03:30 UTC, with up to a 30-minute random delay. The service exits without changes while the certificate has more than 30 days remaining. When renewal is due, it:

1. Requests a new certificate with `tailscale cert`.
2. Checks the certificate hostname and verifies that the certificate and key match.
3. Updates the mounted certificate files and sets the expected key permissions.
4. Restarts the `omni` and `dex` Docker Compose services.
5. Checks that Omni responds over HTTPS.

Tailscale must be connected and able to reach its control plane for renewal to work. A failed renewal is recorded in the systemd journal; the timer will try again on its next run.

## How do I check or run renewal manually?

Run these commands on the Omni VM:

```sh
systemctl list-timers omni-cert-renew.timer
systemctl status omni-cert-renew.service --no-pager
journalctl -u omni-cert-renew.service -n 100 --no-pager
```

To run the check immediately:

```sh
sudo systemctl start omni-cert-renew.service
```

It will be a no-op if the certificate has more than 30 days remaining. Check the certificate on disk with:

```sh
openssl x509 -in /root/git/infra/sidero/omni/tls/tls.cert -noout -subject -issuer -dates
```

To inspect the certificate Omni is serving:

```sh
echo | openssl s_client -connect 127.0.0.1:443 \
  -servername omni.hoki-sole.ts.net 2>/dev/null \
  | openssl x509 -noout -subject -dates
```

## What should I check if renewal fails?

Check the renewal service log first. If it reports a Tailscale or ACME error, confirm Tailscale is connected and review its logs:

```sh
tailscale status
journalctl -u tailscaled --since today --no-pager
```

After fixing the cause, run the renewal service again. It restarts Omni and Dex only when it installs a renewed certificate. Confirm both containers are running with:

```sh
cd /root/git/infra/sidero/omni
docker compose ps
```

## Is there any external reference to this documentation?

- [Tailscale HTTPS certificates](https://tailscale.com/kb/1153/enabling-https) — certificate prerequisites and behavior.
