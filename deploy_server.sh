#!/bin/bash
set -e

echo "=== Step 1: Fix vite.config.ts base path ==="
python3 - << 'PYEOF'
f = '/root/TinyB-Tf-TechTreeDsgnTool/vite.config.ts'
c = open(f).read()
old = "command === 'build' ? './' : '/'"
new = "command === 'build' ? '/TechTree/' : '/'"
if new in c:
    print("vite.config.ts already patched, skipping")
elif old in c:
    c2 = c.replace(old, new)
    open(f, 'w').write(c2)
    print("vite.config.ts patched OK")
else:
    print("WARNING: pattern not found in vite.config.ts, check manually!")
PYEOF

echo "=== Step 2: Fix vite permissions and build ==="
cd /root/TinyB-Tf-TechTreeDsgnTool
chmod +x node_modules/.bin/vite
chmod +x node_modules/.bin/esbuild
npm run build

echo "=== Step 3: Copy dist to /var/www/html/TechTree ==="
rm -rf /var/www/html/TechTree
cp -r /root/TinyB-Tf-TechTreeDsgnTool/dist /var/www/html/TechTree

echo "=== Step 4: Create .htaccess for React SPA ==="
cat > /var/www/html/TechTree/.htaccess << 'HTEOF'
Options -MultiViews
RewriteEngine On
RewriteBase /TechTree/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
HTEOF

echo "=== Step 5: Setup Notion API proxy (Node.js on port 3002) ==="
cp /root/TinyB-Tf-TechTreeDsgnTool/scripts/notion-proxy.js /opt/notion-proxy.js

cat > /etc/systemd/system/notion-proxy.service << 'SVCEOF'
[Unit]
Description=Notion API Reverse Proxy (port 3002)
After=network.target

[Service]
ExecStart=/usr/bin/node /opt/notion-proxy.js
Restart=always
RestartSec=5
Environment=PORT=3002
WorkingDirectory=/opt

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable notion-proxy
systemctl restart notion-proxy
echo "Notion proxy service started on port 3002"

echo "=== Step 6: Patch Apache — Alias + Notion proxy ==="
python3 - << 'PYEOF'
import re, glob

# Find the SSL VirtualHost config with "ServerName ringworms.space"
conf_file = None
files = glob.glob('/etc/apache2/sites-enabled/*.conf')
for f in files:
    try:
        content = open(f).read()
        # Match exact ServerName, not subdomains like svn.ringworms.space
        if 'ServerName ringworms.space' in content and 'SSLEngine' in content:
            conf_file = f
            break
    except:
        pass

if not conf_file:
    print("ERROR: Could not find ringworms.space SSL VirtualHost config!")
    exit(1)

content = open(conf_file).read()
print(f"Patching: {conf_file}")
changed = False

# --- Ensure Alias /TechTree exists ---
if 'Alias /TechTree' not in content:
    alias_block = """
    # TechTree Studio
    Alias /TechTree /var/www/html/TechTree
    <Directory /var/www/html/TechTree>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    ProxyPass /TechTree !
"""
    m = re.search(r'(</VirtualHost>)', content)
    if m:
        content = content[:m.start()] + alias_block + content[m.start():]
        changed = True
        print("Alias /TechTree added")
    else:
        print("WARNING: could not add Alias /TechTree")

# --- Remove old direct ProxyPass to api.notion.com if present ---
for old_line in [
    'ProxyPass /api/notion/ https://api.notion.com/v1/',
    'ProxyPassReverse /api/notion/ https://api.notion.com/v1/',
    'ProxyPass /TechTree/api/notion/ https://api.notion.com/v1/',
    'ProxyPassReverse /TechTree/api/notion/ https://api.notion.com/v1/',
]:
    for variant in ['    ' + old_line + '\n', '    ' + old_line]:
        if variant in content:
            content = content.replace(variant, '')
            changed = True
            print(f"Removed old: {old_line}")

# --- Remove old SSLProxy directives (no longer needed with Node.js proxy) ---
for directive in ['SSLProxyEngine On', 'SSLProxyVerify none',
                  'SSLProxyCheckPeerCN off', 'SSLProxyCheckPeerName off',
                  'SSLProxyCACertificateFile /etc/ssl/certs/ca-certificates.crt']:
    line = '    ' + directive + '\n'
    if line in content:
        content = content.replace(line, '')
        changed = True
        print(f"Removed old SSL proxy directive: {directive}")

# --- Ensure Notion proxy via localhost:3002 ---
if 'ProxyPass /api/notion/ http://127.0.0.1:3002/' not in content:
    # Insert before the catch-all ProxyPass to Gitea
    catch_all = 'ProxyPass / http://localhost:3000/'
    if catch_all in content:
        proxy_block = """    # Notion API Proxy -> Node.js on port 3002
    ProxyPass /api/notion/ http://127.0.0.1:3002/
    ProxyPassReverse /api/notion/ http://127.0.0.1:3002/

    """
        content = content.replace(catch_all, proxy_block + catch_all)
        changed = True
        print("Notion ProxyPass (localhost:3002) added")
    else:
        print("WARNING: catch-all ProxyPass not found, add Notion proxy manually")
else:
    print("Notion ProxyPass already present")

if changed:
    while '\n\n\n' in content:
        content = content.replace('\n\n\n', '\n\n')
    open(conf_file, 'w').write(content)
    print("Apache config saved")
else:
    print("No changes needed")
PYEOF

echo "=== Step 7: Enable Apache modules and reload ==="
a2enmod rewrite proxy proxy_http headers
apache2ctl configtest && systemctl reload apache2

echo ""
echo "=== DONE! ==="
echo "TechTree Studio: https://ringworms.space/TechTree"
echo "Notion proxy:    http://127.0.0.1:3002 (systemd: notion-proxy)"
