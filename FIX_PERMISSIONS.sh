#!/bin/bash

# HeartSphere 权限修复脚本
# 解决 Nginx 500 Internal Server Error 问题

# 设置颜色
green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

echo -e "${green}=== HeartSphere 权限修复脚本 ===${reset}"
echo ""

# 1. 创建标准 web 目录
echo -e "${green}1. 创建标准 web 目录...${reset}"
mkdir -p /var/www/heartsphere

# 2. 复制应用文件到新目录
echo -e "${green}2. 复制应用文件...${reset}"
cp -r /root/heartsphere/dist/* /var/www/heartsphere/

# 3. 设置正确的权限
echo -e "${green}3. 设置文件权限...${reset}"
# 更改所有者为 Nginx 用户（根据系统不同可能是 nginx 或 www-data）
chown -R nginx:nginx /var/www/heartsphere/ || chown -R www-data:www-data /var/www/heartsphere/
# 设置正确的权限
chmod -R 755 /var/www/heartsphere/

# 4. 更新 Nginx 配置
echo -e "${green}4. 更新 Nginx 配置...${reset}"
cat > /etc/nginx/conf.d/heartsphere.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/heartsphere;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /var/www/heartsphere;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOF

# 5. 测试 Nginx 配置
echo -e "${green}5. 测试 Nginx 配置...${reset}"
nginx -t

# 6. 重启 Nginx 服务
echo -e "${green}6. 重启 Nginx 服务...${reset}"
systemctl restart nginx

# 7. 验证修复
echo -e "${green}7. 验证修复...${reset}"
# 检查文件权限
ls -la /var/www/heartsphere/
# 检查 Nginx 状态
systemctl status nginx --no-pager

# 8. 显示结果
echo ""
echo -e "${green}=== 修复完成 ===${reset}"
echo -e "${yellow}应用目录: /var/www/heartsphere${reset}"
echo -e "${yellow}Nginx 配置: /etc/nginx/conf.d/heartsphere.conf${reset}"
echo -e "${yellow}访问地址: http://$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4)${reset}"
echo ""
echo -e "${green}✓ 权限问题已修复！${reset}"
echo ""
