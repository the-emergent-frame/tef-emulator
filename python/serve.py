#!/usr/bin/env python3
"""Build the reference engine and serve a local observer UI."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import subprocess
import threading
import uuid
from urllib.parse import urlparse

from tef_emulator import ROOT, RunConfig, build_engine, run_experiment, verify_run

PUBLIC = ROOT / "viewer" / "public"
ROUTES = {"/": ("index.html", "text/html"), "/app.js": ("app.js", "text/javascript"), "/styles.css": ("styles.css", "text/css")}
RUN_LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def respond(self, code, payload, content_type="application/json"):
        body = json.dumps(payload, allow_nan=False).encode() if content_type == "application/json" else payload
        self.send_response(code)
        self.send_header("Content-Type", content_type + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            self.respond(200, {"status": "ready", "engine": "Rust", "rule": "source-channels-v0.1"})
        elif path in ROUTES:
            filename, mime = ROUTES[path]
            self.respond(200, (PUBLIC / filename).read_bytes(), mime)
        else:
            self.respond(404, {"error": "Not found"})

    def do_POST(self):
        if self.path not in ("/api/run", "/api/export"):
            self.respond(404, {"error": "Not found"})
            return
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + self.headers.get("Host", ""):
            self.respond(403, {"error": "Use the local observer page to run experiments"})
            return
        if not RUN_LOCK.acquire(blocking=False):
            self.respond(409, {"error": "Another experiment is generating; try again shortly"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            limit = 50_000_000 if self.path == "/api/export" else 4096
            if not 0 < size <= limit:
                raise ValueError(f"Request must contain at most {limit} bytes of JSON")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Request must be an object")
            if self.path == "/api/export":
                verify_run(data)
                folder = ROOT / "runs"
                folder.mkdir(exist_ok=True)
                destination = folder / f"tef-0001-{uuid.uuid4().hex[:12]}.json"
                body = json.dumps(data, allow_nan=False, separators=(",", ":")) + "\n"
                with destination.open("x", encoding="utf-8") as output:
                    output.write(body)
                self.respond(200, {"saved": str(destination.relative_to(ROOT))})
            else:
                self.respond(200, run_experiment(RunConfig(**data)))
        except (ValueError, TypeError, KeyError) as error:
            self.respond(400, {"error": str(error)})
        except subprocess.TimeoutExpired:
            self.respond(503, {"error": "Engine exceeded the 30-second run limit"})
        except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
            self.respond(500, {"error": str(error)})
        finally:
            RUN_LOCK.release()

    def log_message(self, message, *args):
        print(f"observer: {message % args}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-build", action="store_true", help="Use the existing Rust release binary")
    args = parser.parse_args()
    if not args.no_build:
        build_engine()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    server.daemon_threads = True
    print(f"TEF observer ready: http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
