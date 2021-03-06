# CoreOS Omaha

Partial [Omaha](https://coreos.com/products/coreupdate/docs/latest/update-protocol.html) protocol implementation used by CoreOS hosts.

[![Docker Repository on Quay](https://quay.io/repository/jcmoraisjr/coreos-omaha/status "Docker Repository on Quay")](https://quay.io/repository/jcmoraisjr/coreos-omaha)

# Usage

Configure CoreOS update server to point to CoreOS Omaha server:

```console
# /etc/coreos/update.conf 
GROUP=stable
SERVER=http://omaha.my-server.com:8000
```

Cloud-init:

```console
#cloud-config
coreos:
  update:
    group: stable
    server: http://omaha.my-server.com:8000
```

The following arguments are mandatory:

* `--urlbase=<URL>` Base URL where CoreOS images should be downloaded
* `--channel=<channel-decl>` One channel declaration, may be used once per channel

Optional arguments:

* `--date` Show date and time when logging
* `--servername=<server>` An optional server name used on response objects
* `--listen=<port>` Port to listen, default is `8000`
* `--trustproxy` Use when behind a proxy which defines `X-Forwarded-For` header

# Channels

Use as much `--channel` arguments as the number of channels.

The argument has the following syntax:

```console
--channel=<name>,<version>,<size>,<sha1-hash>,<sha256-hash>
```

Where:

* `name` is the name of the channel, like `beta` or `stable`
* `version` is the complete version number, like `1122.2.0` or `1192.0.0`
* `size` is the file size in bytes
* `sha1-hash` is the base64 encode of the sha1 hash: `openssl sha -sha1 -binary update.gz | base64`
* `sha256-hash` is the base64 encode of the sha256 hash: `openssl sha -sha256 -binary update.gz | base64`

Download original images from `https://update.release.core-os.net/amd64-usr/<VERSION>/update.gz`.

# Configure

This systemd unit has the most common configurations. Change `update.my-server.com` below to the server where you want CoreOS hosts download the images.

```console
[Unit]
Description=CoreOS Omaha
After=docker.service
Requires=docker.service
[Service]
ExecStartPre=-/usr/bin/docker stop coreos-omaha
ExecStartPre=-/usr/bin/docker rm coreos-omaha
ExecStart=/usr/bin/docker run \
  --name coreos-omaha \
  -p 8000:8000 \
  quay.io/jcmoraisjr/coreos-omaha:latest \
    --channel=alpha,1192.0.0,254754856,EVjNyHkg2EtSUSyf477ExtjP/Lo=,VJiWOBmoFECZk1znmglW6HrknpcQ9LJyb+meaimBjjg= \
    --channel=beta,1185.1.0,247835613,v333LDdL31kVpWeyv+/PtK7fysg=,zE55qgObyunDfNuF0Ny2zwq9hNz98umv7d43F2YY37A= \
    --channel=stable,1122.2.0,212555113,+ZFmPWzv1OdfmKHaGSojbK5Xj3k=,cSBzKN0c6vKinrH0SdqUZSHlQtCa90vmeKC7p/xk19M= \
    --urlbase=http://update.my-server.com/coreos/amd64-usr \
    --servername=update.my-server.com
ExecStop=-/usr/bin/docker stop coreos-omaha
RestartSec=10s
Restart=always
[Install]
WantedBy=multi-user.target
```
