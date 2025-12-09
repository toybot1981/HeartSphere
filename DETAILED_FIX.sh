#!/bin/bash

# HeartSphere 详细修复脚本
# 彻底解决 Nginx 500 Internal Server Error 问题

# 设置颜色
green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

echo -e "${green}=== HeartSphere 详细修复脚本 ===${reset}"
echo ""

# 1. 检查当前 Nginx 配置
echo -e "${green}1. 检查当前 Nginx 配置...${reset}"
# 显示当前配置文件内容
cat /etc/nginx/conf.d/heartsphere.conf

# 2. 创建标准 web 目录
echo -e "${green}2. 创建标准 web 目录...${reset}"
mkdir -p /var/www/heartsphere

# 3. 复制应用文件到新目录
echo -e "${green}3. 复制应用文件...${reset}"
# 确保 dist 目录存在
if [ -d "/root/heartsphere/dist" ]; then
    cp -r /root/heartsphere/dist/* /var/www/heartsphere/
else
    echo -e "${yellow}警告: /root/heartsphere/dist 目录不存在，尝试重新构建项目...${reset}"
    cd /root/heartsphere
    npm install
    npm run build
    cp -r /root/heartsphere/dist/* /var/www/heartsphere/
fi

# 4. 设置正确的权限
echo -e "${green}4. 设置文件权限...${reset}"
# 确定 Nginx 运行用户
NGINX_USER=$(ps aux | grep nginx | grep -v root | grep -v grep | head -1 | awk '{print $1}')
if [ -z "$NGINX_USER" ]; then
    NGINX_USER="nginx" # 默认值
fi
echo -e "${yellow}Nginx 运行用户: $NGINX_USER${reset}"

# 更改所有者和权限
chown -R $NGINX_USER:$NGINX_USER /var/www/heartsphere/
chmod -R 755 /var/www/heartsphere/
chmod 755 /var/www

# 5. 更新 Nginx 配置
echo -e "${green}5. 更新 Nginx 配置...${reset}"
# 备份旧配置
cp /etc/nginx/conf.d/heartsphere.conf /etc/nginx/conf.d/heartsphere.conf.bak

# 写入新配置
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

# 6. 检查所有 Nginx 配置文件
echo -e "${green}6. 检查所有 Nginx 配置文件...${reset}"
# 显示所有配置文件
ls -la /etc/nginx/conf.d/
# 检查主配置文件
grep -r "root" /etc/nginx/conf.d/

# 7. 测试 Nginx 配置
echo -e "${green}7. 测试 Nginx 配置...${reset}"
nginx -t

# 8. 重启 Nginx 服务
echo -e "${green}8. 重启 Nginx 服务...${reset}"
# 确保服务重启
systemctl stop nginx
sleep 2
systemctl start nginx
systemctl status nginx --no-pager

# 9. 验证修复
echo -e "${green}9. 验证修复...${reset}"
# 检查文件权限
ls -la /var/www/heartsphere/
# 检查 Nginx 进程
ps aux | grep nginx
# 检查端口监听
netstat -tuln | grep 80

# 10. 测试访问
echo -e "${green}10. 测试访问...${reset}"
# 使用 curl 测试本地访问
curl -I http://localhost
curl -I http://127.0.0.1

# 11. 显示结果
echo ""
echo -e "${green}=== 修复完成 ===${reset}"
echo -e "${yellow}应用目录: /var/www/heartsphere${reset}"
echo -e "${yellow}Nginx 配置: /etc/nginx/conf.d/heartsphere.conf${reset}"
echo -e "${yellow}Nginx 运行用户: $NGINX_USER${reset}"
echo -e "${yellow}访问地址: http://$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4)${reset}"
echo ""
echo -e "${green}✓ 修复完成！请访问 http://$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4) 验证结果${reset}"
echo ""

# 12. 清理旧配置（可选）
echo -e "${yellow}是否清理旧配置和目录？(y/n): ${reset}"
read -r cleanup
if [ "$cleanup" = "y" ] || [ "$cleanup" = "Y" ]; then
    echo -e "${green}清理旧配置...${reset}"
    rm -rf /root/heartsphere
    echo -e "${green}✓ 旧配置已清理${reset}"
fi
