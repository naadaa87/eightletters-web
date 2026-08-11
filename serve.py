import http.server, socketserver, os
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?')[0].split('#')[0]
        if p != '/' and '.' not in os.path.basename(p):
            path = p.rstrip('/') + '.html'
        return super().translate_path(path)
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', 8021), H) as s:
    s.serve_forever()
