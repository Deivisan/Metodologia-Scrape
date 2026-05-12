#!/usr/bin/env python3
"""
dod/dashboard.py — Dashboard Web para Deploy em Massa

Uso:
    ./dod/dashboard.py                    # porta 8000, lê de hosts.txt
    ./dod/dashboard.py --port 8080        # porta customizada
    ./dod/dashboard.py --hosts hosts.txt  # arquivo de hosts customizado

    # no navegador: http://localhost:8000

hosts.txt (IP  [nome]  [mac]  — mac é opcional, descoberto automaticamente):
    192.168.1.10  pc-lab-01
    192.168.1.11  pc-lab-02
    ...

Credenciais (via environment):
    SSH_USER=root        (default)
    SSH_PASS=8u@3tArb!   (default)
"""
import argparse
import json
import os
import socket
import subprocess
import sys
import threading
import time
from functools import wraps
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────
HOSTS_FILE = Path(__file__).parent / "hosts.txt"
MACS_FILE = Path(__file__).parent / "macs.txt"
RESULTS_DIR = Path("/tmp/dod-dashboard")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

SSH_USER = os.environ.get("SSH_USER", "root")
SSH_PASS = os.environ.get("SSH_PASS", "8u@3tArb!")
MAX_PARALLEL = int(os.environ.get("MAX_PARALLEL", "10"))
REPO_BASE = "https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod"

PORT = int(os.environ.get("PORT", "8000"))

# ── Hosts ──────────────────────────────────────────────────────────────────
def load_hosts(hosts_path: Path) -> list[dict]:
    """Carrega hosts.txt — formato: IP [NOME] [MAC_OPCIONAL]"""
    hosts = []
    if not hosts_path.exists():
        print(f"[dashboard] ✗ Arquivo não encontrado: {hosts_path}")
    return hosts

def load_macs(macs_path: Path) -> list[dict]:
    """Carrega macs.txt — formato: MAC [NOME]"""
    hosts = []
    if not macs_path.exists():
        return hosts

    with open(macs_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 1:
                mac = parts[0].lower().replace("-", ":")
                hosts.append({
                    "ip": "?",
                    "nome": parts[1] if len(parts) > 1 else mac,
                    "mac": mac,
                    "hostname": "?",
                    "mac_real": mac,
                })
    return hosts

    with open(hosts_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 1:
                hosts.append({
                    "ip": parts[0],
                    "nome": parts[1] if len(parts) > 1 else parts[0],
                    "mac": parts[2] if len(parts) > 2 else None,
                    "hostname": "?",
                    "mac_real": "?",
                })
    return hosts

# ── Estado global ──────────────────────────────────────────────────────────
class State:
    def __init__(self, hosts):
        self.hosts = hosts
        self.total = len(hosts)
        self.lock = threading.Lock()
        # resultados: dict ip -> {status, exit_code, hostname, mac, log, start, end}
        self.results: dict[str, dict] = {}
        self.running = False

    def update(self, ip: str, data: dict):
        with self.lock:
            if ip not in self.results:
                self.results[ip] = {}
            self.results[ip].update(data)
            self.results[ip]["updated_at"] = time.time()

    def get(self, ip: str) -> dict:
        with self.lock:
            return self.results.get(ip, {})

    def list(self) -> list[dict]:
        with self.lock:
            out = []
            for h in self.hosts:
                ip = h["ip"]
                r = self.results.get(ip, {})
                out.append({
                    **h,
                    "status": r.get("status", "pending"),
                    "exit_code": r.get("exit_code"),
                    "hostname": r.get("hostname_real") or h.get("hostname", "?"),
                    "mac_real": r.get("mac_real") or h.get("mac", "?"),
                    "log": r.get("log", ""),
                    "start": r.get("start"),
                    "end": r.get("end"),
                    "updated_at": r.get("updated_at"),
                })
            return out

    def summary(self) -> dict:
        hosts = self.list()
        return {
            "total": self.total,
            "done": sum(1 for h in hosts if h["status"] == "done"),
            "running": sum(1 for h in hosts if h["status"] == "running"),
            "failed": sum(1 for h in hosts if h["status"] == "failed"),
            "pending": sum(1 for h in hosts if h["status"] == "pending"),
            "hosts": hosts,
        }

# ── Executor remoto ────────────────────────────────────────────────────────
def discover_host(ip: str) -> tuple[str, str]:
    """Descobre hostname e MAC de uma máquina via SSH."""
    cmd = (
        f"echo HOSTNAME=$(hostname); "
        f"for f in /sys/class/net/*/address; do "
        f"  mac=$(cat $f); "
        f"  [ \"$mac\" != \"00:00:00:00:00:00\" ] && echo MAC=$mac && break; "
        f"done"
    )
    try:
        ssh_cmd = _ssh_cmd(ip, cmd, timeout=10)
        out = subprocess.check_output(ssh_cmd, shell=False, stderr=subprocess.DEVNULL).decode()
        hostname = "?"
        mac = "?"
        for line in out.strip().split("\n"):
            if line.startswith("HOSTNAME="):
                hostname = line.split("=", 1)[1].strip()
            elif line.startswith("MAC="):
                mac = line.split("=", 1)[1].strip()
        return hostname, mac
    except Exception:
        return "?", "?"

def _ssh_cmd(ip: str, cmd: str, timeout: int = 30) -> list[str]:
    """Monta comando SSH (com sshpass se disponível)."""
    base = [
        "ssh",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "ConnectTimeout=10",
        "-o", "ServerAliveInterval=15",
        f"{SSH_USER}@{ip}",
        cmd,
    ]
    # tenta sshpass se existir
    if subprocess.run(["which", "sshpass"], capture_output=True).returncode == 0 and SSH_PASS:
        return ["sshpass", "-e"] + base
    return base

def run_remote(ip: str, mode: str, state: State):
    """Executa script remoto em background."""
    state.update(ip, {
        "status": "running",
        "start": time.time(),
        "mode": mode,
    })

    script_map = {
        "setup": "setup_dod.sh",
        "teardown": "teardown_dod.sh",
        "verify": "verify_dod.sh",
    }
    script = script_map.get(mode, "setup_dod.sh")
    remote_cmd = f"curl -fsSL {REPO_BASE}/{script} | sudo bash"

    # descobre hostname e MAC antes
    hostname, mac = discover_host(ip)
    state.update(ip, {
        "hostname_real": hostname,
        "mac_real": mac,
    })

    # executa
    try:
        ssh_cmd = _ssh_cmd(ip, remote_cmd, timeout=300)
        env = os.environ.copy()
        if SSH_PASS:
            env["SSHPASS"] = SSH_PASS

        proc = subprocess.run(
            ssh_cmd,
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )

        log = proc.stdout[-500:] + proc.stderr[-500:]  # últimas 500 chars
        status = "done" if proc.returncode == 0 else "failed"
        state.update(ip, {
            "status": status,
            "exit_code": proc.returncode,
            "log": log,
            "end": time.time(),
        })
    except subprocess.TimeoutExpired:
        state.update(ip, {
            "status": "failed",
            "exit_code": -1,
            "log": "TIMEOUT: 300s excedido",
            "end": time.time(),
        })
    except Exception as e:
        state.update(ip, {
            "status": "failed",
            "exit_code": -2,
            "log": f"ERRO: {str(e)}",
            "end": time.time(),
        })

# ── HTTP Handler ──────────────────────────────────────────────────────────
class DashboardHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silencioso

    def _html(self):
        return self._render_page()

    def _render_page(self) -> bytes:
        summary = self.server.state.summary()
        hosts = summary["hosts"]

        rows = ""
        for i, h in enumerate(hosts, 1):
            status = h["status"]
            if status == "done":
                badge = '<span class="badge done">✅ OK</span>'
            elif status == "running":
                badge = '<span class="badge running">⏳ Rodando</span>'
            elif status == "failed":
                badge = '<span class="badge failed">❌ Falha</span>'
            else:
                badge = '<span class="badge pending">⏸️  Pendente</span>'

            log = h.get("log", "")[-200:]
            log_escaped = log.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            log_html = f"<pre class='log'>{log_escaped}</pre>" if log else ""

            rows += f"""
            <tr>
                <td class="num">{i}</td>
                <td class="ip">{h['ip']}</td>
                <td class="nome">{h['nome']}</td>
                <td class="hostname">{h['hostname']}</td>
                <td class="mac"><code>{h['mac_real']}</code></td>
                <td class="status-cell">{badge}</td>
                <td class="log-cell">{log_html}</td>
            </tr>"""

        html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DOD Dashboard — Deploy</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: #0f1117;
    color: #e1e4e8;
    padding: 20px;
}}
h1 {{
    font-size: 1.4em;
    margin-bottom: 4px;
    color: #58a6ff;
}}
.sub {{
    color: #8b949e;
    font-size: 0.85em;
    margin-bottom: 20px;
}}
.summary {{
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
}}
.stat-card {{
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px 18px;
    flex: 1;
    min-width: 100px;
    text-align: center;
}}
.stat-card .num {{
    font-size: 1.8em;
    font-weight: 700;
    display: block;
}}
.stat-card .label {{
    font-size: 0.75em;
    text-transform: uppercase;
    color: #8b949e;
    letter-spacing: 0.5px;
}}
.stat-card.done .num {{ color: #3fb950; }}
.stat-card.failed .num {{ color: #f85149; }}
.stat-card.running .num {{ color: #d29922; }}
.stat-card.pending .num {{ color: #8b949e; }}

table {{
    width: 100%;
    border-collapse: collapse;
    background: #161b22;
    border-radius: 8px;
    overflow: hidden;
    font-size: 0.82em;
}}
th {{
    background: #1c2128;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    color: #8b949e;
    text-transform: uppercase;
    font-size: 0.75em;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #30363d;
}}
td {{
    padding: 10px 12px;
    border-bottom: 1px solid #21262d;
    vertical-align: middle;
}}
tr:hover {{ background: #1c2128; }}
.num {{ color: #8b949e; width: 30px; text-align: center; }}
.ip {{ font-family: monospace; color: #58a6ff; }}
.nome {{ font-weight: 500; }}
.hostname {{ color: #7ee787; }}
.mac code {{ color: #8b949e; font-size: 0.85em; }}

.badge {{
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
}}
.badge.done {{ background: #1b3625; color: #3fb950; }}
.badge.failed {{ background: #3d1c1c; color: #f85149; }}
.badge.running {{ background: #3d2e0e; color: #d29922; }}
.badge.pending {{ background: #21262d; color: #8b949e; }}

.log {{
    font-size: 0.75em;
    color: #8b949e;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: #0d1117;
    padding: 4px 8px;
    border-radius: 4px;
    margin: 0;
}}
.log:hover {{
    white-space: pre-wrap;
    max-width: 500px;
    position: absolute;
    background: #0d1117;
    border: 1px solid #30363d;
    padding: 8px;
    z-index: 10;
}}

.actions {{
    margin: 20px 0;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}}
.btn {{
    background: #21262d;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 8px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    text-decoration: none;
    display: inline-block;
}}
.btn:hover {{ background: #30363d; }}
.btn.primary {{ background: #1f6feb; border-color: #1f6feb; color: #fff; }}

@media (max-width: 768px) {{
    table {{ font-size: 0.7em; }}
    td, th {{ padding: 6px 8px; }}
    .log {{ max-width: 100px; }}
}}
</style>
</head>
<body>
<h1>🖥️ DOD Dashboard</h1>
<p class="sub">Deploy em {summary['total']} máquinas · <span id="clock">{time.strftime('%H:%M:%S')}</span> · <span id="refresh-status">ao vivo</span></p>

<div class="summary">
    <div class="stat-card done"><span class="num">{summary['done']}</span><span class="label">Concluídos</span></div>
    <div class="stat-card running"><span class="num">{summary['running']}</span><span class="label">Rodando</span></div>
    <div class="stat-card failed"><span class="num">{summary['failed']}</span><span class="label">Falhas</span></div>
    <div class="stat-card pending"><span class="num">{summary['pending']}</span><span class="label">Pendentes</span></div>
</div>

<div class="actions">
    <a href="/run/setup" class="btn primary">▶ Setup</a>
    <a href="/run/verify" class="btn">🔍 Verificar</a>
    <a href="/run/teardown" class="btn">🗑️ Limpar</a>
    <a href="/api/status" class="btn">📄 JSON</a>
</div>

<table>
<thead>
<tr><th>#</th><th>IP</th><th>Nome</th><th>Hostname</th><th>MAC</th><th>Status</th><th>Log</th></tr>
</thead>
<tbody>
{rows}
</tbody>
</table>

<script>
let lastEvent = Date.now();
function refresh() {{
    fetch('/api/status')
        .then(r => r.json())
        .then(d => {{
            document.querySelector('.stat-card.done .num').textContent = d.done;
            document.querySelector('.stat-card.running .num').textContent = d.running;
            document.querySelector('.stat-card.failed .num').textContent = d.failed;
            document.querySelector('.stat-card.pending .num').textContent = d.pending;
            document.getElementById('refresh-status').textContent = d.running > 0 ? '⏳ rodando...' : '✅ parado';
            document.getElementById('clock').textContent = new Date().toLocaleTimeString('pt-BR');
        }})
        .catch(() => {{}});
}}
setInterval(refresh, 5000);
</script>
</body>
</html>"""
        return html.encode()

    def _json_response(self, data: dict):
        data_bytes = json.dumps(data, indent=2, default=str).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data_bytes)))
        self.end_headers()
        self.wfile.write(data_bytes)

    def _html_response(self, html: bytes, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(html)

    def _run_mode(self, mode: str):
        """Dispara execução em background."""
        state = self.server.state
        if state.running:
            self._html_response("<h1>Já está rodando</h1><a href='/'>Voltar</a>".encode())
            return
        state.running = True

        def run_all():
            threads = []
            for h in state.hosts:
                ip = h["ip"]
                if state.get(ip).get("status") in ("running",):
                    continue
                t = threading.Thread(target=run_remote, args=(ip, mode, state), daemon=True)
                t.start()
                threads.append(t)
                # rate limit
                while sum(1 for th in threads if th.is_alive()) >= MAX_PARALLEL:
                    time.sleep(1)
            for t in threads:
                t.join()
            state.running = False

        threading.Thread(target=run_all, daemon=True).start()
        self._html_response(f"<html><head><meta http-equiv='refresh' content='1;url=/'></head><body><h1>🚀 {mode} iniciado em {state.total} máquinas</h1><p>Redirecionando...</p></body></html>".encode())

    def do_GET(self):
        state = self.server.state

        if self.path == "/" or self.path == "/index.html":
            self._html_response(self._html())
        elif self.path == "/api/status":
            self._json_response(state.summary())
        elif self.path.startswith("/run/setup"):
            self._run_mode("setup")
        elif self.path.startswith("/run/verify"):
            self._run_mode("verify")
        elif self.path.startswith("/run/teardown"):
            self._run_mode("teardown")
        elif self.path == "/api/hosts":
            self._json_response({"hosts": state.hosts})
        else:
            self._html_response("<h1>404</h1><p>Rota nao encontrada</p>".encode(), 404)

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="DOD Dashboard — Deploy em Massa")
    parser.add_argument("--port", type=int, default=PORT, help="Porta do servidor (default: 8000)")
    parser.add_argument("--hosts", type=str, default=str(HOSTS_FILE), help="Caminho do hosts.txt")
    args = parser.parse_args()

    hosts_path = Path(args.hosts)
    hosts = load_hosts(hosts_path)

    # Se não achou hosts.txt, tenta carregar MACs
    if not hosts:
        macs_path = MACS_FILE
        hosts = load_macs(macs_path)
        if hosts:
            print(f"[dashboard] 📋 Carregados {len(hosts)} MACs de {macs_path}")
            print("[dashboard] 🔍 Tentando descobrir IPs via escaneamento de rede...")
            # tenta escanear a rede local
            import re
            try:
                # arp-scan
                iface = subprocess.run(
                    ["ip", "route"], capture_output=True, text=True
                ).stdout
                iface = [l.split() for l in iface.split("\n") if "default" in l]
                iface = iface[0][4] if iface else ""

                if iface:
                    result = subprocess.run(
                        ["sudo", "arp-scan", "--localnet", "--interface", iface],
                        capture_output=True, text=True, timeout=30,
                    )
                    for line in result.stdout.split("\n"):
                        parts = line.strip().split()
                        if len(parts) >= 2 and re.match(r"^\d+\.\d+\.\d+\.\d+$", parts[0]):
                            ip, mac = parts[0], parts[1].lower()
                            for h in hosts:
                                if h["mac"] == mac or h["mac"].replace(":", "-") == mac:
                                    h["ip"] = ip
                                    break
                    found = sum(1 for h in hosts if h["ip"] != "?")
                    print(f"[dashboard] ✅ {found}/{len(hosts)} IPs descobertos via arp-scan")
            except Exception:
                print("[dashboard] ⚠ Escaneamento falhou. Use ./dod/discover.sh manualmente")

            # verifica se descobriu todos
            missing = [h for h in hosts if h["ip"] == "?"]
            if missing:
                print(f"[dashboard] ⚠ {len(missing)} máquinas sem IP. IPs precisam ser descobertos.")
                print(f"[dashboard]   Execute: sudo ./dod/discover.sh")
        else:
            print(f"[dashboard] ✗ Nenhum host ou MAC encontrado.")
            print(f"[dashboard]   Crie hosts.txt (IP [NOME]) ou macs.txt (MAC [NOME])")
            sys.exit(1)

    print(f"[dashboard] 📋 Carregados {len(hosts)} hosts")

    # Descobre hostname e MAC de hosts já acessíveis
    print("[dashboard] 🔍 Descobrindo hostname e MAC das máquinas...")
    state = State(hosts)
    for h in hosts:
        ip = h["ip"]
        if ip == "?" or ip.startswith("#"):
            print(f"  → {h['mac'] or h['nome']}... ⏸️  sem IP")
            state.update(ip, {"hostname_real": "?", "mac_real": h.get("mac", "?")})
            continue
        print(f"  → {ip}... ", end="", flush=True)
        hostname, mac = discover_host(ip)
        state.update(ip, {
            "hostname_real": hostname,
            "mac_real": mac or h.get("mac", "?"),
        })
        print(f"{hostname} | {mac}")

    # Servidor HTTP
    server = HTTPServer(("0.0.0.0", args.port), DashboardHandler)
    server.state = state

    print("")
    print(f"[dashboard] 🌐 Servidor rodando em: http://localhost:{args.port}")
    print(f"[dashboard]    Dashboard: http://localhost:{args.port}/")
    print(f"[dashboard]    JSON API:  http://localhost:{args.port}/api/status")
    print(f"[dashboard]    Setup:     http://localhost:{args.port}/run/setup")
    print(f"[dashboard]    Verificar: http://localhost:{args.port}/run/verify")
    print(f"[dashboard]    Limpar:    http://localhost:{args.port}/run/teardown")
    print(f"[dashboard] 📱 Acesse de qualquer dispositivo na rede")
    print(f"[dashboard]    http://{socket.gethostbyname(socket.gethostname())}:{args.port}")
    print(f"[dashboard] 🔴 Ctrl+C para parar")
    print("")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[dashboard] 👋 Servidor encerrado")
        server.shutdown()

if __name__ == "__main__":
    main()
