sudo systemctl stop nginx.service
sudo systemctl stop ws_server.service;
sudo systemctl stop frontend.service;
cd /var/www/relong
git pull;
npm i;
npm run build;
sudo systemctl start ws_server.service;
sudo systemctl start nginx.service;
sudo systemctl start frontend.service;