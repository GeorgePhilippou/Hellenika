#!/usr/bin/env python3
"""Static dev server for Hellenika.

Plain http.server lets the browser cache ES modules aggressively, which
makes edit-reload cycles unreliable. This sends no-store on everything
and the correct MIME type for .js modules.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/Users/georgephilippou/Documents/GitHub/Hellenika"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8931


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Keep the console useful: only report failures.
        status = args[1] if len(args) > 1 else ""
        if str(status).startswith(("4", "5")):
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    handler = partial(Handler, directory=ROOT)
    print(f"Hellenika dev server → http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), handler).serve_forever()
