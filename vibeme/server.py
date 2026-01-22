#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

class VibeMeHandler(SimpleHTTPRequestHandler):
  def do_GET(self) -> None:
    if self.path in {"/", ""}:
      self.path = "/mofalaya/vibeme/index.html"
    super().do_GET()


def main() -> None:
  repo_root = Path(__file__).resolve().parents[2]
  os.chdir(repo_root)
  host = "localhost"
  port = 8008
  server = ThreadingHTTPServer((host, port), VibeMeHandler)
  print(f"Serving {repo_root} at http://{host}:{port}/")
  server.serve_forever()

if __name__ == "__main__":
  main()
