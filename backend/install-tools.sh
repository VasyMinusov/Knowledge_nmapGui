#!/usr/bin/env bash
# backend/install-tools.sh
# Установка инструментов пентеста/разведки/анализа в образ бэкенда.
#
# Профили (build-arg TOOLS_PROFILE):
#   slim  — только пакеты apt (быстрая сборка, ~400 МБ поверх базового образа)
#   full  — apt + Go-инструменты (ProjectDiscovery и др.) + pipx + testssl.sh
#           (по умолчанию; сборка дольше и образ крупнее ~1.5–2 ГБ)
#
# Отсутствие отдельного пакета/инструмента НЕ прерывает сборку — в конце
# печатается сводка пропущенного.
set -u

PROFILE="${TOOLS_PROFILE:-full}"
export DEBIAN_FRONTEND=noninteractive

SKIPPED=""
note_skip() { SKIPPED="${SKIPPED} $1"; echo "!! пропущен: $1"; }

apt-get update

# Ставим по одному пакету — отсутствие одного не роняет весь слой.
apt_try() {
  for pkg in "$@"; do
    if apt-get install -y --no-install-recommends "$pkg"; then
      echo "ok: $pkg"
    else
      note_skip "apt:$pkg"
    fi
  done
}

# ── базовый набор (оба профиля) ────────────────────────────────────────────
apt_try \
  nmap masscan \
  whatweb sqlmap wafw00f dirb \
  hydra medusa \
  sslscan \
  dnsutils dnsrecon whois ldap-utils \
  smbclient nbtscan onesixtyone snmp \
  netcat-openbsd curl wget \
  iputils-ping traceroute mtr-tiny \
  ca-certificates openssl git perl \
  libnet-ssleay-perl libwhisker2-perl tar xz-utils jq

apt-get clean && rm -rf /var/lib/apt/lists/*

# ── nikto: в Debian trixie удалён из репозиториев — берём с GitHub ─────────
if ! command -v nikto >/dev/null 2>&1; then
  if git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto; then
    printf '#!/bin/sh\nexec perl /opt/nikto/program/nikto.pl "$@"\n' > /usr/local/bin/nikto
    chmod +x /usr/local/bin/nikto
    echo "ok: nikto (github)"
  else
    note_skip "nikto"
  fi
fi

if [ "$PROFILE" = "slim" ]; then
  echo "----"
  echo "TOOLS_PROFILE=slim — Go/pipx-инструменты пропущены"
  [ -n "$SKIPPED" ] && echo "Не установлено:$SKIPPED"
  exit 0
fi

# ── build-зависимости только для профиля full ─────────────────────────────
apt-get update
apt_try golang-go libpcap-dev build-essential
apt-get clean && rm -rf /var/lib/apt/lists/*

# ── pipx: Python-инструменты ──────────────────────────────────────────────
if pip install --no-cache-dir pipx; then
  export PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin
  for p in sslyze theHarvester arjun dirsearch; do
    pipx install "$p" || note_skip "pipx:$p"
  done
else
  note_skip "pipx"
fi

# ── Go: ProjectDiscovery и утилиты OSINT ──────────────────────────────────
if command -v go >/dev/null 2>&1; then
  export GOBIN=/usr/local/bin GOPATH=/opt/go GOFLAGS=-mod=mod
  go_install() { go install "$1" || note_skip "go:${1%@*}"; }

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

  rm -rf /opt/go/pkg /root/.cache/go-build || true
else
  note_skip "golang-go (весь набор Go-инструментов)"
fi

# ── feroxbuster: готовый бинарник, без Rust ───────────────────────────────
( cd /usr/local/bin \
  && curl -sL "https://raw.githubusercontent.com/epi052/feroxbuster/main/install-nix.sh" | bash \
) || note_skip "feroxbuster"

# ── testssl.sh ────────────────────────────────────────────────────────────
if git clone --depth 1 https://github.com/drwetter/testssl.sh.git /opt/testssl; then
  ln -sf /opt/testssl/testssl.sh /usr/local/bin/testssl
else
  note_skip "testssl.sh"
fi

# первичная загрузка шаблонов nuclei (не критично при офлайн-сборке)
command -v nuclei >/dev/null 2>&1 && (nuclei -update-templates || true)

echo "========================================"
if [ -n "$SKIPPED" ]; then
  echo "install-tools.sh (full): готово. НЕ установлено:$SKIPPED"
else
  echo "install-tools.sh (full): все инструменты установлены"
fi
exit 0
