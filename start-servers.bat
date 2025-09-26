@echo off
echo Starting Fit Track Development Servers...
echo.

echo Starting Backend Server (Port 3001)...
cd backend
start "Backend Server" cmd /k "node server.js"

echo.
echo Starting Frontend Server (Port 3000)...
cd ../web-frontend
start "Frontend Server" cmd /k "python -c \"import http.server, socketserver; Handler = http.server.SimpleHTTPRequestHandler; httpd = socketserver.TCPServer(('', 3000), Handler); print('Frontend server running at http://localhost:3000'); httpd.serve_forever()\""

echo.
echo Both servers are starting...
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window (servers will keep running)
pause > nul