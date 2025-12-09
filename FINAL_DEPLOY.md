# HeartSphere 最终部署指南

## 步骤1：连接到服务器

在终端中执行：
```bash
ssh root@8.137.36.167
```

输入密码：`Tyx@19811009`

## 步骤2：执行部署命令

成功登录后，复制并粘贴以下命令，按回车键执行：

```bash
# 更新系统
yum update -y || apt-get update -y

# 安装必要的软件包
yum install -y git wget curl || apt-get install -y git wget curl

# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs || apt-get install -y nodejs

# 安装 Nginx
yum install -y nginx || apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# 创建项目目录并克隆代码
mkdir -p /root/heartsphere
cd /root/heartsphere
if [ -d ".git" ]; then git pull; else git clone https://github.com/toybot1981/HeartSphere.git .; fi

# 安装依赖并构建项目
npm install
npm run build

# 配置 Nginx
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

# 重启 Nginx
nginx -t && systemctl restart nginx
 
# 显示部署结果
echo "==================================="
echo "部署成功！"
echo "访问地址: http://$(curl -s http://100.100.100.200/latest/meta-data/public-ipv4)"
echo "==================================="
```

## 步骤3：验证部署

部署完成后，打开浏览器访问：
```
http://8.137.36.167
```

## 步骤4：退出服务器

执行以下命令退出 SSH 连接：
```bash
exit
```

## 部署说明

- 上述命令适用于 CentOS 和 Ubuntu 系统
- 命令会自动处理不同系统的差异
- 部署过程大约需要 5-10 分钟，取决于服务器性能和网络速度
- 部署完成后，您可以通过 http://8.137.36.167 访问应用

## 常见问题

### 无法访问网站

- 检查服务器防火墙是否开放 80 端口
- 检查 Nginx 是否正在运行：`systemctl status nginx`
- 检查 Nginx 日志：`tail -f /var/log/nginx/error.log`

### Node.js 安装失败

- 尝试使用不同的 Node.js 版本：`curl -fsSL https://rpm.nodesource.com/setup_16.x | bash -`
- 手动下载并安装 Node.js：https://nodejs.org/

### 构建失败

- 检查依赖是否安装成功：`npm install`
- 检查 Node.js 版本是否兼容：`node -v`
- 查看构建日志，根据错误信息进行修复

## 更新项目

当需要更新项目时，登录服务器并执行以下命令：

```bash
cd /root/heartsphere
git pull
npm install
npm run build
systemctl restart nginx
```

按照上述步骤执行，您将能够成功将 HeartSphere 项目部署到阿里云 ECS 服务器上。