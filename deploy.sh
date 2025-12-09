#!/bin/bash

# ECS Vue项目部署脚本
# 用于拉取最新代码、重新构建并重启Nginx

# 配置项 - 根据实际情况修改
PROJECT_DIR="/path/to/your/vue/project"  # Vue项目根目录
GIT_BRANCH="main"  # 要拉取的Git分支
BUILD_DIR="dist"  # Vue构建输出目录，默认是dist
BACKUP_DIR="/tmp/vue_backup"  # 备份目录
NODE_VERSION=""  # 指定Node.js版本（如果使用nvm/n），留空使用系统默认

# 颜色定义
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m"  # No Color

echo -e "${YELLOW}===== 开始部署Vue项目 =====${NC}"

# 检查脚本是否具有执行权限
if [ ! -x "$0" ]; then
    echo -e "${YELLOW}提示: 脚本没有执行权限，正在添加...${NC}"
    chmod +x "$0"
fi

# 1. 检查项目目录是否存在
echo -e "${GREEN}1. 检查项目目录${NC}"
if [ ! -d "${PROJECT_DIR}" ]; then
    echo -e "${RED}错误: 项目目录 ${PROJECT_DIR} 不存在${NC}"
    exit 1
fi

# 进入项目目录
cd "${PROJECT_DIR}" || {
    echo -e "${RED}错误: 无法进入项目目录${NC}"
    exit 1
}

# 2. 初始化Node.js环境
echo -e "${GREEN}2. 初始化Node.js环境${NC}"
# 检查是否使用nvm
if [ -f "$HOME/.nvm/nvm.sh" ] && [ -n "${NODE_VERSION}" ]; then
    echo -e "${BLUE}使用nvm切换Node.js版本到 ${NODE_VERSION}${NC}"
    source "$HOME/.nvm/nvm.sh"
    nvm use "${NODE_VERSION}" || {
        echo -e "${RED}错误: 无法切换Node.js版本${NC}"
        exit 1
    }
elif [ -f "$HOME/.n/bin/n" ] && [ -n "${NODE_VERSION}" ]; then
    # 检查是否使用n
    echo -e "${BLUE}使用n切换Node.js版本到 ${NODE_VERSION}${NC}"
    sudo n "${NODE_VERSION}" || {
        echo -e "${RED}错误: 无法切换Node.js版本${NC}"
        exit 1
    }
else
    # 检查Node.js是否安装
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        exit 1
    fi
    echo -e "${BLUE}使用系统默认Node.js版本: $(node --version)${NC}"
fi

# 3. 拉取最新Git代码
echo -e "${GREEN}3. 拉取最新Git代码 (分支: ${GIT_BRANCH})${NC}"
# 检查Git是否安装
if ! command -v git &> /dev/null; then
    echo -e "${RED}错误: Git 未安装${NC}"
    exit 1
fi

# 检查是否为Git仓库
if [ ! -d ".git" ]; then
    echo -e "${RED}错误: 当前目录不是Git仓库${NC}"
    exit 1
fi

git checkout "${GIT_BRANCH}" || {
    echo -e "${RED}错误: 无法切换到分支 ${GIT_BRANCH}${NC}"
    exit 1
}

git pull origin "${GIT_BRANCH}" || {
    echo -e "${RED}错误: 无法拉取最新代码${NC}"
    exit 1
}

# 4. 备份旧的构建文件
echo -e "${GREEN}4. 备份旧的构建文件${NC}"
if [ -d "${BUILD_DIR}" ]; then
    # 创建备份目录
    mkdir -p "${BACKUP_DIR}"
    # 备份构建文件
    BACKUP_FILE="${BACKUP_DIR}/vue_build_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "${BACKUP_FILE}" "${BUILD_DIR}" || {
        echo -e "${YELLOW}警告: 备份失败，但继续部署${NC}"
    }
    echo -e "${BLUE}旧构建文件已备份到: ${BACKUP_FILE}${NC}"
fi

# 5. 清理npm缓存
echo -e "${GREEN}5. 清理npm缓存${NC}"
npm cache clean --force || {
    echo -e "${YELLOW}警告: 缓存清理失败，但继续部署${NC}"
}

# 6. 安装/更新依赖
echo -e "${GREEN}6. 安装/更新项目依赖${NC}"
npm install || {
    echo -e "${RED}错误: 依赖安装失败${NC}"
    exit 1
}

# 7. 构建Vue项目
echo -e "${GREEN}7. 构建Vue项目${NC}"
npm run build || {
    echo -e "${RED}错误: 项目构建失败${NC}"
    exit 1
}

# 8. 检查构建结果
echo -e "${GREEN}8. 检查构建结果${NC}"
if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}错误: 构建失败，未生成 ${BUILD_DIR} 目录${NC}"
    exit 1
fi

echo -e "${BLUE}构建成功，构建文件位于: ${BUILD_DIR}${NC}"

# 9. 重启Nginx
echo -e "${GREEN}9. 重启Nginx服务${NC}"
# 检查Nginx控制方式
if command -v systemctl &> /dev/null; then
    sudo systemctl restart nginx || {
        echo -e "${RED}错误: Nginx重启失败${NC}"
        exit 1
    }
elif command -v service &> /dev/null; then
    sudo service nginx restart || {
        echo -e "${RED}错误: Nginx重启失败${NC}"
        exit 1
    } else
    echo -e "${RED}错误: 无法确定Nginx控制方式${NC}"
    exit 1
fi

# 10. 验证Nginx是否运行
echo -e "${GREEN}10. 验证Nginx状态${NC}"
sleep 2  # 等待Nginx启动
if command -v systemctl &> /dev/null; then
    sudo systemctl status nginx --no-pager | grep -q "active (running)" || {
        echo -e "${RED}错误: Nginx未正常运行${NC}"
        exit 1
    }
elif command -v service &> /dev/null; then
    sudo service nginx status | grep -q "running" || {
        echo -e "${RED}错误: Nginx未正常运行${NC}"
        exit 1
    }
fi

echo -e "${GREEN}===== 部署完成！=====${NC}"
echo -e "${BLUE}部署信息:${NC}"
echo -e "${BLUE}- 项目目录: ${PROJECT_DIR}${NC}"
echo -e "${BLUE}- Git分支: ${GIT_BRANCH}${NC}"
echo -e "${BLUE}- Node.js版本: $(node --version)${NC}"
echo -e "${BLUE}- 构建目录: ${BUILD_DIR}${NC}"
