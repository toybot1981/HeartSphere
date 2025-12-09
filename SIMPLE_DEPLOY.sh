#!/bin/bash

# HeartSphere 简化部署脚本
# 直接在服务器上执行此脚本

# 设置颜色
green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

echo -e "${green}=== HeartSphere 部署脚本 ===${reset}"
echo ""

# 1. 更新系统
echo -e "${green}1. 更新系统包...${reset}"
yum update -y || apt-get update -y
echo -e "${green}✓ 系统更新完成${reset}"
echo ""

# 2. 安装必要的软件包
echo -e "${green}2. 安装必要的软件包...${reset}"
yum install -y git wget curl || apt-get install -y git wget curl
echo -e "${green}✓ 软件包安装完成${reset}"
echo ""

# 3. 安装 Node.js 18
echo -e "${green}3. 安装 Node.js 18...${reset}"
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs || apt-get install -y nodejs
echo -e "${green}✓ Node.js 版本: $(node -v)${reset}"
echo -e "${green}✓ npm 版本: $(npm -v)${reset}"
echo ""

# 3. 安装 Nginx
echo -e "${green}3. 安装 Nginx...${reset}"
yum install -y nginx || apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${green}✓ Nginx 已安装并启动${reset}"
echo ""

# 4. 克隆项目
echo -e "${green}4. 克隆项目代码...${reset}"
mkdir -p /root/heartsphere
cd /root/heartsphere
if [ -d ".git" ]; then
    echo -e "${yellow}项目已存在，更新代码...${reset}"
    git pull
else
    git clone https://github.com/toybot1981/HeartSphere.git .
fi
echo -e "${green}✓ 项目代码获取完成${reset}"
echo ""

# 5. 安装依赖
echo -e "${green}5. 安装项目依赖...${reset}"
npm install
echo -e "${green}✓ 依赖安装完成${reset}"
echo ""

# 6. 构建项目
echo -e "${green}6. 构建项目...${reset}"
npm run build
echo -e "${green}✓ 项目构建完成${reset}"
echo ""

# 7. 配置 Nginx
echo -e "${green}7. 配置 Nginx...${reset}"
cat > /etc/nginx/conf.d/heartsphere.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        root /root/heartsphere/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /root/heartsphere/dist;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOF

echo -e "${green}✓ Nginx 配置完成${reset}"
echo ""

# 8. 重启 Nginx
echo -e "${green}8. 重启 Nginx...${reset}"
nginx -t && systemctl restart nginx
echo -e "${green}✓ Nginx 已重启${reset}"
echo ""

# 9. 完成部署
echo -e "${green}=== 部署完成 ===${reset}"
echo -e "${yellow}项目路径: /root/heartsphere${reset}"
echo -e "${yellow}访问地址: http://$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4)${reset}"
echo -e "${yellow}Nginx 配置: /etc/nginx/conf.d/heartsphere.conf${reset}"
echo ""
echo -e "${green}✓ HeartSphere 部署成功！${reset}"
echo ""
