#!/bin/bash

# HeartSphere 完整部署脚本
# 适配阿里云 Workbench 环境
# 版本: 1.0.0

# 设置颜色输出
green='\033[0;32m'
yellow='\033[1;33m'
red='\033[0;31m'
reset='\033[0m'

# 配置项
PROJECT_NAME="heartsphere"
PROJECT_PATH="/root/$PROJECT_NAME"
WEB_DIR="/var/www/heartsphere"
GIT_REPO="https://github.com/toybot1981/HeartSphere.git"
NODE_VERSION="18"

# 欢迎信息
echo -e "${green}=== HeartSphere 阿里云 Workbench 部署脚本 ===${reset}"
echo ""
echo -e "${yellow}项目名称: ${PROJECT_NAME}${reset}"
echo -e "${yellow}Git 仓库: ${GIT_REPO}${reset}"
echo -e "${yellow}部署目录: ${WEB_DIR}${reset}"
echo ""

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
  echo -e "${red}错误: 请以 root 用户身份执行此脚本${reset}"
  exit 1
fi

# 1. 系统更新和基础软件安装
echo -e "${green}1. 系统更新和基础软件安装...${reset}"
echo -e "${yellow}更新系统包...${reset}"
yum update -y || apt-get update -y

echo -e "${yellow}安装必要软件包...${reset}"
yum install -y git wget curl gcc gcc-c++ make || apt-get install -y git wget curl build-essential

if [ $? -eq 0 ]; then
    echo -e "${green}✓ 基础软件安装完成${reset}"
else
    echo -e "${red}错误: 基础软件安装失败${reset}"
    exit 1
fi
echo ""

# 2. 安装 Node.js 18
echo -e "${green}2. 安装 Node.js ${NODE_VERSION}...${reset}"

# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
yum install -y nodejs || apt-get install -y nodejs

# 验证 Node.js 安装
node_version=$(node -v 2>&1)
npm_version=$(npm -v 2>&1)

if [[ "$node_version" == *"v${NODE_VERSION}"* ]]; then
    echo -e "${green}✓ Node.js 版本: ${node_version}${reset}"
    echo -e "${green}✓ npm 版本: ${npm_version}${reset}"
else
    echo -e "${red}错误: Node.js 安装失败，当前版本: ${node_version}${reset}"
    exit 1
fi
echo ""

# 3. 安装 Nginx
echo -e "${green}3. 安装 Nginx...${reset}"

# 安装 Nginx
yum install -y nginx || apt-get install -y nginx

# 启动并设置 Nginx 自启
systemctl enable nginx
systemctl start nginx

# 验证 Nginx 安装
nginx_status=$(systemctl is-active nginx 2>&1)
if [ "$nginx_status" == "active" ]; then
    echo -e "${green}✓ Nginx 已安装并启动${reset}"
else
    echo -e "${red}错误: Nginx 安装或启动失败，状态: ${nginx_status}${reset}"
    exit 1
fi
echo ""

# 4. 克隆项目代码
echo -e "${green}4. 克隆项目代码...${reset}"

# 检查项目目录是否存在
if [ -d "$PROJECT_PATH" ]; then
    echo -e "${yellow}项目目录已存在，更新代码...${reset}"
    cd "$PROJECT_PATH"
    git pull
else
    echo -e "${yellow}克隆项目代码...${reset}"
    git clone "$GIT_REPO" "$PROJECT_PATH"
fi

if [ $? -eq 0 ]; then
    echo -e "${green}✓ 项目代码获取完成${reset}"
else
    echo -e "${red}错误: 项目代码获取失败${reset}"
    exit 1
fi
echo ""

# 5. 安装依赖并构建项目
echo -e "${green}5. 安装依赖并构建项目...${reset}"

cd "$PROJECT_PATH"

# 安装依赖
echo -e "${yellow}安装项目依赖...${reset}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${red}错误: 依赖安装失败${reset}"
    exit 1
fi

# 构建项目
echo -e "${yellow}构建项目...${reset}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${green}✓ 项目构建完成${reset}"
else
    echo -e "${red}错误: 项目构建失败${reset}"
    exit 1
fi
echo ""

# 6. 创建 Web 目录并复制文件
echo -e "${green}6. 配置 Web 环境...${reset}"

# 创建标准 Web 目录
mkdir -p "$WEB_DIR"

# 复制构建产物到 Web 目录
echo -e "${yellow}复制构建产物...${reset}"
cp -r "$PROJECT_PATH/dist"/* "$WEB_DIR/"

# 检查文件是否复制成功
if [ -f "$WEB_DIR/index.html" ]; then
    echo -e "${green}✓ 构建产物复制完成${reset}"
else
    echo -e "${red}错误: 构建产物复制失败${reset}"
    exit 1
fi

# 下载默认 favicon.ico
echo -e "${yellow}下载默认 favicon.ico...${reset}"
wget -O "$WEB_DIR/favicon.ico" "https://via.placeholder.com/32x32/000000/ffffff?text=HS" > /dev/null 2>&1 || true

# 设置正确的权限
echo -e "${yellow}设置文件权限...${reset}"
# 确定 Nginx 运行用户
NGINX_USER=$(ps aux | grep nginx | grep -v root | grep -v grep | head -1 | awk '{print $1}')
if [ -z "$NGINX_USER" ]; then
    # 根据系统类型设置默认用户
    if grep -q "CentOS" /etc/os-release 2>&1 || grep -q "Red Hat" /etc/os-release 2>&1; then
        NGINX_USER="nginx"
    else
        NGINX_USER="www-data"
    fi
fi
echo -e "${yellow}Nginx 运行用户: ${NGINX_USER}${reset}"

# 设置所有者和权限
chown -R "$NGINX_USER:$NGINX_USER" "$WEB_DIR/"
chmod -R 755 "$WEB_DIR/"
chmod 755 "/var/www"

echo -e "${green}✓ Web 环境配置完成${reset}"
echo ""

# 7. 配置 Nginx
echo -e "${green}7. 配置 Nginx...${reset}"

# 备份旧配置
if [ -f "/etc/nginx/conf.d/${PROJECT_NAME}.conf" ]; then
    mv "/etc/nginx/conf.d/${PROJECT_NAME}.conf" "/etc/nginx/conf.d/${PROJECT_NAME}.conf.bak"
    echo -e "${yellow}已备份旧配置文件${reset}"
fi

# 创建 Nginx 配置文件
cat > "/etc/nginx/conf.d/${PROJECT_NAME}.conf" << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 直接在配置中定义必要的 MIME 类型
    # 确保 JavaScript 模块脚本正确加载
    types {
        text/html                                        html htm shtml;
        text/css                                         css;
        text/xml                                         xml;
        image/gif                                        gif;
        image/jpeg                                       jpeg jpg;
        # JavaScript 文件的所有 MIME 类型
        application/javascript                           js mjs;
        application/x-javascript                         js mjs;
        text/javascript                                  js mjs;
        image/png                                        png;
        image/tiff                                       tif tiff;
        image/vnd.wap.wbmp                               wbmp;
        image/x-icon                                     ico;
        image/x-jng                                      jng;
        image/x-ms-bmp                                   bmp;
        application/json                                 json;
        application/zip                                  zip;
        application/octet-stream                         bin exe dll;
    }
    default_type application/octet-stream;
    
    # 主站点配置
    location / {
        root /var/www/heartsphere;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 确保 JavaScript 文件返回正确的 MIME 类型
        if ($request_uri ~* \.m?js$) {
            add_header Content-Type "application/javascript";
        }
    }
    
    # 静态文件配置
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|json|zip)$ {
        root /var/www/heartsphere;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        
        # 为 JavaScript 文件明确设置 Content-Type
        if ($request_uri ~* \.m?js$) {
            add_header Content-Type "application/javascript";
        }
    }
    
    # 禁用隐藏文件访问
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# 检查 Nginx 配置
echo -e "${yellow}测试 Nginx 配置...${reset}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${green}✓ Nginx 配置正确${reset}"
else
    echo -e "${red}错误: Nginx 配置有误，请检查日志${reset}"
    exit 1
fi

echo -e "${yellow}重启 Nginx 服务...${reset}"
# 先停止，再启动，确保完全重启
systemctl stop nginx
sleep 2
systemctl start nginx

# 检查 Nginx 状态
nginx_status=$(systemctl is-active nginx 2>&1)
if [ "$nginx_status" == "active" ]; then
    echo -e "${green}✓ Nginx 服务重启成功${reset}"
else
    echo -e "${red}错误: Nginx 服务启动失败，状态: ${nginx_status}${reset}"
    exit 1
fi
echo ""

# 8. 验证部署
echo -e "${green}8. 验证部署...${reset}"

# 获取服务器公网 IP
PUBLIC_IP=$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4 2>&1 || echo "8.137.36.167")

# 检查应用是否可以访问
echo -e "${yellow}测试应用访问...${reset}"
curl -I "http://${PUBLIC_IP}" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${green}✓ 应用访问测试成功${reset}"
else
    echo -e "${yellow}警告: 应用访问测试失败，请检查防火墙设置${reset}"
fi
echo ""

# 9. 部署完成
echo -e "${green}=== 部署完成 ===${reset}"
echo ""
echo -e "${green}✓ HeartSphere 应用已成功部署到阿里云 ECS${reset}"
echo ""
echo -e "${yellow}项目信息:${reset}"
echo -e "  - 项目名称: ${PROJECT_NAME}"
echo -e "  - 项目路径: ${PROJECT_PATH}"
echo -e "  - Web 目录: ${WEB_DIR}"
echo -e "  - Git 仓库: ${GIT_REPO}"
echo ""
echo -e "${yellow}访问信息:${reset}"
echo -e "  - 访问地址: http://${PUBLIC_IP}"
echo -e "  - Nginx 配置: /etc/nginx/conf.d/${PROJECT_NAME}.conf"
echo -e "  - 访问日志: /var/log/nginx/access.log"
echo -e "  - 错误日志: /var/log/nginx/error.log"
echo ""
echo -e "${yellow}常用命令:${reset}"
echo -e "  - 查看 Nginx 状态: systemctl status nginx"
echo -e "  - 重启 Nginx: systemctl restart nginx"
echo -e "  - 查看日志: tail -f /var/log/nginx/access.log /var/log/nginx/error.log"
echo -e "  - 更新项目: cd ${PROJECT_PATH} && git pull && npm install && npm run build && cp -r dist/* ${WEB_DIR}/"
echo ""
echo -e "${green}部署脚本执行完成！${reset}"
echo -e "${green}应用已准备就绪，可通过浏览器访问: http://${PUBLIC_IP}${reset}"
echo ""
