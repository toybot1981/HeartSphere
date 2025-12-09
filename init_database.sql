-- HeartSphere 数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS heartsphere CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE heartsphere;

-- 创建角色表
CREATE TABLE IF NOT EXISTS characters (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    era VARCHAR(100),
    role VARCHAR(100) NOT NULL,
    bio TEXT NOT NULL,
    avatar_url VARCHAR(255) NOT NULL,
    background_url VARCHAR(255) NOT NULL,
    system_instruction TEXT NOT NULL,
    theme_color VARCHAR(20) NOT NULL,
    color_accent VARCHAR(20) NOT NULL,
    first_message TEXT NOT NULL,
    voice_name VARCHAR(100) NOT NULL,
    mbti VARCHAR(10),
    tags JSON,
    speech_style TEXT,
    catchphrases JSON,
    secrets TEXT,
    motivations TEXT,
    relationships TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建时代场景表
CREATE TABLE IF NOT EXISTS world_scenes (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    main_story_character_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (main_story_character_id) REFERENCES characters(id) ON DELETE SET NULL
);

-- 创建时代记忆表
CREATE TABLE IF NOT EXISTS era_memories (
    id VARCHAR(36) PRIMARY KEY,
    world_scene_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (world_scene_id) REFERENCES world_scenes(id) ON DELETE CASCADE
);

-- 创建自定义剧本题
CREATE TABLE IF NOT EXISTS custom_scenarios (
    id VARCHAR(36) PRIMARY KEY,
    scene_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    start_node_id VARCHAR(36) NOT NULL,
    author VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (scene_id) REFERENCES world_scenes(id) ON DELETE CASCADE
);

-- 创建故事节点表
CREATE TABLE IF NOT EXISTS story_nodes (
    id VARCHAR(36) PRIMARY KEY,
    scenario_id VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    prompt TEXT NOT NULL,
    background_hint TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES custom_scenarios(id) ON DELETE CASCADE
);

-- 创建故事选项表
CREATE TABLE IF NOT EXISTS story_options (
    id VARCHAR(36) PRIMARY KEY,
    story_node_id VARCHAR(36) NOT NULL,
    text TEXT NOT NULL,
    next_node_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (story_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (next_node_id) REFERENCES story_nodes(id) ON DELETE CASCADE
);

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建用户配置表
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    nickname VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建日志回声表
CREATE TABLE IF NOT EXISTS journal_echos (
    id VARCHAR(36) PRIMARY KEY,
    character_name VARCHAR(100) NOT NULL,
    text TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建日志条目表
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    image_url VARCHAR(255),
    echo_id VARCHAR(36),
    insight TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (echo_id) REFERENCES journal_echos(id) ON DELETE SET NULL
);

-- 创建邮件表
CREATE TABLE IF NOT EXISTS mails (
    id VARCHAR(36) PRIMARY KEY,
    sender_id VARCHAR(36) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_avatar_url VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    theme_color VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建调试日志表
CREATE TABLE IF NOT EXISTS debug_logs (
    id VARCHAR(36) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    method VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建场景-角色关联表
CREATE TABLE IF NOT EXISTS scene_character_relations (
    scene_id VARCHAR(36) NOT NULL,
    character_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (scene_id, character_id),
    FOREIGN KEY (scene_id) REFERENCES world_scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- 创建自定义角色关联表
CREATE TABLE IF NOT EXISTS custom_character_relations (
    scene_id VARCHAR(36) NOT NULL,
    character_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (scene_id, character_id),
    FOREIGN KEY (scene_id) REFERENCES world_scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- 创建游戏状态表
CREATE TABLE IF NOT EXISTS game_states (
    id VARCHAR(36) PRIMARY KEY,
    user_profile_id VARCHAR(36) NOT NULL,
    current_screen VARCHAR(50) NOT NULL,
    selected_scene_id VARCHAR(36),
    selected_character_id VARCHAR(36),
    selected_scenario_id VARCHAR(36),
    temp_story_character_id VARCHAR(36),
    editing_scenario_id VARCHAR(36),
    generating_avatar_id VARCHAR(36),
    active_journal_entry_id VARCHAR(36),
    last_login_time BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_scene_id) REFERENCES world_scenes(id) ON DELETE SET NULL,
    FOREIGN KEY (selected_character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (selected_scenario_id) REFERENCES custom_scenarios(id) ON DELETE SET NULL,
    FOREIGN KEY (temp_story_character_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (editing_scenario_id) REFERENCES custom_scenarios(id) ON DELETE SET NULL,
    FOREIGN KEY (generating_avatar_id) REFERENCES characters(id) ON DELETE SET NULL,
    FOREIGN KEY (active_journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
);

-- 创建设置表
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(36) PRIMARY KEY,
    user_profile_id VARCHAR(36) NOT NULL,
    auto_generate_avatars BOOLEAN DEFAULT TRUE,
    auto_generate_story_scenes BOOLEAN DEFAULT TRUE,
    auto_generate_journal_images BOOLEAN DEFAULT TRUE,
    debug_mode BOOLEAN DEFAULT FALSE,
    text_provider VARCHAR(20) NOT NULL,
    image_provider VARCHAR(20) NOT NULL,
    video_provider VARCHAR(20) NOT NULL,
    audio_provider VARCHAR(20) NOT NULL,
    enable_fallback BOOLEAN DEFAULT TRUE,
    gemini_config JSON NOT NULL,
    openai_config JSON NOT NULL,
    qwen_config JSON NOT NULL,
    doubao_config JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'model') NOT NULL,
    text TEXT NOT NULL,
    image VARCHAR(255),
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建场景记忆关联表
CREATE TABLE IF NOT EXISTS scene_memory_relations (
    scene_id VARCHAR(36) NOT NULL,
    memory_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (scene_id, memory_id),
    FOREIGN KEY (scene_id) REFERENCES world_scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (memory_id) REFERENCES era_memories(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX idx_world_scenes_name ON world_scenes(name);
CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_custom_scenarios_title ON custom_scenarios(title);
CREATE INDEX idx_journal_entries_timestamp ON journal_entries(timestamp);
CREATE INDEX idx_mails_timestamp ON mails(timestamp);
CREATE INDEX idx_era_memories_timestamp ON era_memories(timestamp);

-- 插入示例数据
-- 插入示例角色
INSERT INTO characters (id, name, age, era, role, bio, avatar_url, background_url, system_instruction, theme_color, color_accent, first_message, voice_name, mbti, tags, speech_style, catchphrases, secrets, motivations, relationships) 
VALUES 
('1', '李白', 30, '盛唐', '诗人', '唐代著名诗人，号青莲居士', 'https://example.com/li_bai.jpg', 'https://example.com/tang_dynasty.jpg', '你是唐代诗人李白，性格豪放不羁，喜欢饮酒作诗', '#FF5733', '#C70039', '君不见黄河之水天上来，奔流到海不复回', 'male', 'ENFP', '["诗人", "豪放", "饮酒"]', '豪放不羁，充满想象力', '["天生我材必有用", "千金散尽还复来"]', '其实我也有不为人知的忧郁', '希望自己的诗歌能流传千古', '与杜甫是好友，与王维有交往');

-- 插入示例时代场景
INSERT INTO world_scenes (id, name, description, image_url, main_story_character_id) 
VALUES 
('1', '盛唐', '唐朝的鼎盛时期，文化繁荣，国力强盛', 'https://example.com/tang_dynasty.jpg', '1');

-- 插入示例时代记忆
INSERT INTO era_memories (id, world_scene_id, content, image_url, timestamp) 
VALUES 
('1', '1', '今天在长安街上看到了许多外国人，他们来自遥远的国度', 'https://example.com/changan_street.jpg', 1234567890000);

-- 插入示例自定义剧本
INSERT INTO custom_scenarios (id, scene_id, title, description, start_node_id, author) 
VALUES 
('1', '1', '长安酒会', '在长安的一家酒楼上，你遇到了李白', '1', 'system');

-- 插入示例故事节点
INSERT INTO story_nodes (id, scenario_id, title, description, prompt, background_hint) 
VALUES 
('1', '1', '酒楼上的相遇', '你在长安的一家酒楼上喝酒，遇到了李白', '你看到李白正在独自饮酒，你会怎么做？', '长安酒楼，灯火辉煌');

-- 插入示例故事选项
INSERT INTO story_options (id, story_node_id, text, next_node_id) 
VALUES 
('1', '1', '上前与他攀谈', '1');

-- 插入示例用户
INSERT INTO users (id, username, password, email) 
VALUES 
('1', 'testuser', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'test@example.com');

-- 插入示例用户配置
INSERT INTO user_profiles (id, user_id, nickname, avatar_url) 
VALUES 
('1', '1', '测试用户', 'https://example.com/avatar.jpg');

-- 插入示例日志回声
INSERT INTO journal_echos (id, character_name, text, timestamp, image_url) 
VALUES 
('1', '李白', '人生得意须尽欢，莫使金樽空对月', 1234567890000, 'https://example.com/poem.jpg');

-- 插入示例日志条目
INSERT INTO journal_entries (id, title, content, timestamp, image_url, echo_id, insight) 
VALUES 
('1', '与李白的相遇', '今天在长安酒楼上遇到了李白，我们一起饮酒作诗', 1234567890000, 'https://example.com/meeting.jpg', '1', '人生短暂，要珍惜每一刻');

-- 插入示例邮件
INSERT INTO mails (id, sender_id, sender_name, sender_avatar_url, subject, content, timestamp, is_read, theme_color) 
VALUES 
('1', '1', '李白', 'https://example.com/li_bai.jpg', '邀请你参加诗会', '明天在我家有一个诗会，诚邀你参加', 1234567890000, FALSE, '#FF5733');

-- 插入示例场景-角色关联
INSERT INTO scene_character_relations (scene_id, character_id) 
VALUES 
('1', '1');

-- 插入示例设置
INSERT INTO app_settings (id, user_profile_id, auto_generate_avatars, auto_generate_story_scenes, auto_generate_journal_images, debug_mode, text_provider, image_provider, video_provider, audio_provider, enable_fallback, gemini_config, openai_config, qwen_config, doubao_config) 
VALUES 
('1', '1', TRUE, TRUE, TRUE, FALSE, 'gemini', 'gemini', 'gemini', 'gemini', TRUE, '{"apiKey": "", "modelName": "gemini-1.5-pro"}', '{"apiKey": "", "modelName": "gpt-4"}', '{"apiKey": "", "modelName": "qwen-max"}', '{"apiKey": "", "modelName": "doubao-pro"}');

-- 插入示例游戏状态
INSERT INTO game_states (id, user_profile_id, current_screen, selected_scene_id, selected_character_id, selected_scenario_id, temp_story_character_id, editing_scenario_id, generating_avatar_id, active_journal_entry_id, last_login_time) 
VALUES 
('1', '1', 'profileSetup', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1234567890000);