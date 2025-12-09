# HeartSphere 手动部署指南

## 前置条件

- 阿里云 ECS 实例（公网 IP：8.137.36.167）
- SSH 客户端（终端、PuTTY 等）
- 用户名：root
- 密码：Tyx@19811009

## 部署步骤

### 1. 连接到服务器

使用 SSH 客户端连接到服务器：

```bash
ssh root@8.137.36.167
```

输入密码：`Tyx@19811009`

### 2. 安装必要的软件

#### 2.1 安装 Node.js 和 npm

**CentOS 7：**
```bash
# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 验证安装
node -v
npm -v
```

**Ubuntu 20.04：**
```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

#### 2.2 安装 Nginx

**CentOS 7：**
```bash
yum install -y nginx
systemctl enable nginx
systemctl start nginx
```

**Ubuntu 20.04：**
```bash
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3. 克隆项目代码

```bash
# 创建项目目录
mkdir -p /root/heartsphere
cd /root/heartsphere

# 克隆项目
git clone https://github.com/toybot1981/HeartSphere.git .
```

### 4. 安装依赖并构建项目

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 5. 配置 Nginx

创建或修改 Nginx 配置文件：

**CentOS 7：**
```bash
vi /etc/nginx/conf.d/heartsphere.conf
```

**Ubuntu 20.04：**
```bash
vi /etc/nginx/sites-available/heartsphere
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /root/heartsphere/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /root/heartsphere/dist;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
```

**Ubuntu 20.04 额外步骤：**
```bash
# 启用配置文件
ln -s /etc/nginx/sites-available/heartsphere /etc/nginx/sites-enabled/
```

### 6. 测试并重启 Nginx

```bash
# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 7. 验证部署

打开浏览器访问：
```
http://8.137.36.167
```

## 常见问题及解决方案

### 1. 无法访问网站

- 检查服务器防火墙是否开放 80 端口
- 检查 Nginx 是否正在运行：`systemctl status nginx`
- 检查 Nginx 日志：`tail -f /var/log/nginx/error.log`

### 2. Node.js 安装失败

- 尝试使用不同的 Node.js 版本（如 16.x）
- 手动下载并安装 Node.js：https://nodejs.org/

### 3. 构建失败

- 检查依赖是否安装成功：`npm install`
- 检查 Node.js 版本是否兼容
- 查看构建日志，根据错误信息进行修复

## 更新项目

当需要更新项目时，可以执行以下命令：

```bash
cd /root/heartsphere
git pull
npm install
npm run build
systemctl restart nginx
```

## 项目路径说明

- 项目目录：`/root/heartsphere`
- 构建产物：`/root/heartsphere/dist`
- Nginx 配置：
  - CentOS 7：`/etc/nginx/conf.d/heartsphere.conf`
  - Ubuntu 20.04：`/etc/nginx/sites-available/heartsphere`
- Nginx 日志：`/var/log/nginx/`

## 联系方式

如果遇到问题，可以通过以下方式获取帮助：

- 查看项目 README：https://github.com/toybot1981/HeartSphere
- 查看阿里云文档：https://help.aliyun.com/
- 联系项目维护者

---

部署完成后，您可以通过 http://8.137.36.167 访问 HeartSphere 应用。
