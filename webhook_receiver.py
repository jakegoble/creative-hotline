"""Lightweight webhook receiver for n8n cache invalidation.

n8n workflows send HTTP POST to this endpoint after key events.
This script writes a signal file that the Streamlit app polls for
instant cache invalidation.

Usage:
    python webhook_receiver.py

n8n HTTP Request node config:
    URL: http://<your-server>:8765/webhook
    Method: POST
    Body: {"event": "payment_completed"}  (or booking_created, intake_submitted, etc.)

Add an HTTP Request node at the end of WF1-WF4 and WF9 in n8n.
"""

import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

SIGNAL_FILE = os.path.join(os.path.dirname(__file__), "plans", ".cache_signal.json")
PORT = int(os.environ.get("WEBHOOK_PORT", 8765))

VALID_EVENTS = {
    "payment_completed",
    "booking_created",
    "intake_submitted",
    "new_lead",
    "action_plan_sent",
    "status_changed",
}


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/webhook":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error": "Invalid JSON"}')
            return

        event = data.get("event", "unknown")
        if event not in VALID_EVENTS:
            event = "unknown"

        # Write signal file for Streamlit to pick up
        os.makedirs(os.path.dirname(SIGNAL_FILE), exist_ok=True)
        with open(SIGNAL_FILE, "w") as f:
            json.dump({"event": event, "data": data}, f)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "event": event}).encode())

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status": "healthy"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"[webhook] {args[0]}")


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    print(f"Webhook receiver listening on port {PORT}")
    print(f"Signal file: {SIGNAL_FILE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.server_close()
