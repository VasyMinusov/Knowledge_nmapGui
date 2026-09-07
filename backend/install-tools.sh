#!/usr/bin/env bash
# backend/install-tools.sh
# Установка инструментов пентеста/разведки/анализа в образ бэкенда.
#
# Профили (build-arg TOOLS_PROFILE):
#   slim  — только пакеты apt (быстрая сборка, ~400 МБ поверх базового образа)
#   full  — apt + Go-инструменты (ProjectDiscovery и др.) + pipx + testssl.sh
#           (по умолчанию; сборка дольше и образ крупнее ~1.5–2 ГБ)
set -eux

PROFILE="${TOOLS_PROFILE:-full}"
export DEBIAN_FRONTEND=noninteractive

# ── apt: базовый набор (есть в обоих профилях) ──────────────────────────────
APT_TOOLS="
  nmap masscan
  nikto whatweb sqlmap wafw00f dirb
  hydra medusa
  sslscan
  dnsutils dnsrecon whois ldap-utils
  smbclient nbtscan onesixtyone snmp
  netcat-openbsd curl wget
  iputils-ping traceroute mtr-tiny
  ca-certificates openssl git
"

apt-get update
apt-get install -y --no-install-recommends $APT_TOOLS
# словари: dirb приносит /usr/share/dirb/wordlists/common.txt
rm -rf /var/lib/apt/lists/*

if [ "$PROFILE" = "slim" ]; then
  echo "TOOLS_PROFILE=slim — Go/pipx-инструменты пропущены"
  exit 0
fi

# ── build-зависимости только для профиля full ───────────────────────────────
apt-get update
apt-get install -y --no-install-recommends golang-go libpcap-dev build-essential
rm -rf /var/lib/apt/lists/*

# ── pipx: Python-инструменты ────────────────────────────────────────────────
pip install --no-cache-dir pipx
export PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin
pipx install sslyze            || true
pipx install theHarvester      || true
pipx install arjun             || true
pipx install dirsearch         || true

# ── Go: ProjectDiscovery и утилиты OSINT ────────────────────────────────────
export GOBIN=/usr/local/bin GOPATH=/opt/go GOFLAGS=-mod=mod
go_install() { go install "$1" || echo "!! пропущен: $1"; }

go_install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go_install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go_install github.com/projectdiscovery/httpx/cmd/httpx@latest
go_install github.com/projectdiscovery/dnsx/cmd/dnsx@latest
go_install github.com/projectdiscovery/katana/cmd/katana@latest
go_install github.com/projectdiscovery/tlsx/cmd/tlsx@latest
go_install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
go_install github.com/ffuf/ffuf/v2@latest
go_install github.com/OJ/gobuster/v3@latest
go_install github.com/hahwul/dalfox/v2@latest
go_install github.com/tomnomnom/assetfinder@latest
go_install github.com/tomnomnom/waybackurls@latest
go_install github.com/lc/gau/v2/cmd/gau@latest
go_install github.com/owasp-amass/amass/v4/...@master

# feroxbuster (готовый бинарник, без Rust-тулчейна)
curl -sL "https://raw.githubusercontent.com/epi052/feroxbuster/main/install-nix.sh" | bash -s -- /usr/local/bin || true

# testssl.sh
git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl \
  && ln -sf /opt/testssl/testssl.sh /usr/local/bin/testssl || true

# первичная загрузка шаблонов nuclei (не критично при офлайн-сборке)
/usr/local/bin/nuclei -update-templates || true

# чистим кэши сборки Go
rm -rf /opt/go/pkg /root/.cache/go-build || true
echo "install-tools.sh: профиль full завершён"
