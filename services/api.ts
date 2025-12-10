// API服务，用于处理与后端的通信

const API_BASE_URL = 'http://localhost:8080/api';

// 通用请求函数
const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `请求失败: ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    // 处理网络错误
    if (error.name === 'TypeError') {
      throw new Error('网络连接失败，请检查服务器是否正在运行');
    }
    throw error;
  }
};

// 认证相关API
export const authApi = {
  // 用户登录
  login: (username: string, password: string) => {
    return request<{
      token: string;
      type: string;
      id: number;
      username: string;
      email: string;
      nickname: string;
      avatar: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // 用户注册
  register: (username: string, email: string, password: string) => {
    return request<{
      token: string;
      type: string;
      id: number;
      username: string;
      email: string;
      nickname: string;
      avatar: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  // 获取当前用户信息
  getCurrentUser: (token: string) => {
    return request<{
      id: number;
      username: string;
      email: string;
      nickname: string;
      avatar: string;
    }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// 微信登录API
export const wechatApi = {
  // 微信登录
  login: (code: string) => {
    return request<{
      token: string;
      type: string;
      id: number;
      username: string;
      email: string;
      nickname: string;
      avatar: string;
    }>('/wechat/login', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  // 获取微信AppID
  getAppId: () => {
    return request<{ appid: string }>('/wechat/appid');
  },
};

// 世界相关API
export const worldApi = {
  // 获取所有世界
  getAllWorlds: (token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      createdAt: string;
      updatedAt: string;
    }>>('/worlds', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取单个世界
  getWorldById: (id: number, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      createdAt: string;
      updatedAt: string;
    }>(`/worlds/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 创建世界
  createWorld: (name: string, description: string, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      createdAt: string;
      updatedAt: string;
    }>('/worlds', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 更新世界
  updateWorld: (id: number, name: string, description: string, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      createdAt: string;
      updatedAt: string;
    }>(`/worlds/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 删除世界
  deleteWorld: (id: number, token: string) => {
    return request<void>(`/worlds/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// 记录相关API
export const journalApi = {
  // 获取所有记录
  getAllJournalEntries: (token: string) => {
    return request<Array<{
      id: number;
      title: string;
      content: string;
      entryDate: string;
      worldId: number;
      eraId: number;
      characterId: number;
      createdAt: string;
      updatedAt: string;
    }>>('/journal-entries', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取单个记录
  getJournalEntryById: (id: number, token: string) => {
    return request<{
      id: number;
      title: string;
      content: string;
      entryDate: string;
      worldId: number;
      eraId: number;
      characterId: number;
      createdAt: string;
      updatedAt: string;
    }>(`/journal-entries/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 创建记录
  createJournalEntry: (data: {
    title: string;
    content: string;
    entryDate?: string;
    worldId?: number;
    eraId?: number;
    characterId?: number;
  }, token: string) => {
    return request<{
      id: number;
      title: string;
      content: string;
      entryDate: string;
      worldId: number;
      eraId: number;
      characterId: number;
      createdAt: string;
      updatedAt: string;
    }>('/journal-entries', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 更新记录
  updateJournalEntry: (id: number, data: {
    title: string;
    content: string;
    entryDate?: string;
    worldId?: number;
    eraId?: number;
    characterId?: number;
  }, token: string) => {
    return request<{
      id: number;
      title: string;
      content: string;
      entryDate: string;
      worldId: number;
      eraId: number;
      characterId: number;
      createdAt: string;
      updatedAt: string;
    }>(`/journal-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 删除记录
  deleteJournalEntry: (id: number, token: string) => {
    return request<void>(`/journal-entries/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// 时代相关API
export const eraApi = {
  // 获取所有时代
  getAllEras: (token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      startYear: number;
      endYear: number;
      worldId: number;
      createdAt: string;
      updatedAt: string;
    }>>('/eras', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取指定世界的所有时代
  getErasByWorldId: (worldId: number, token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      startYear: number;
      endYear: number;
      worldId: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/eras/world/${worldId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 创建时代
  createEra: (data: {
    name: string;
    description: string;
    startYear?: number;
    endYear?: number;
    worldId: number;
  }, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      startYear: number;
      endYear: number;
      worldId: number;
      createdAt: string;
      updatedAt: string;
    }>('/eras', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 更新时代
  updateEra: (id: number, data: {
    name: string;
    description: string;
    startYear?: number;
    endYear?: number;
    worldId: number;
  }, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      startYear: number;
      endYear: number;
      worldId: number;
      createdAt: string;
      updatedAt: string;
    }>(`/eras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 删除时代
  deleteEra: (id: number, token: string) => {
    return request<void>(`/eras/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// 角色相关API
export const characterApi = {
  // 获取所有角色
  getAllCharacters: (token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      age: number;
      gender: string;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>('/characters', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取指定世界的所有角色
  getCharactersByWorldId: (worldId: number, token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      age: number;
      gender: string;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/characters/world/${worldId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取指定时代的所有角色
  getCharactersByEraId: (eraId: number, token: string) => {
    return request<Array<{
      id: number;
      name: string;
      description: string;
      age: number;
      gender: string;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/characters/era/${eraId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 创建角色
  createCharacter: (data: {
    name: string;
    description: string;
    age?: number;
    gender?: string;
    worldId: number;
    eraId?: number;
  }, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      age: number;
      gender: string;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>('/characters', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 更新角色
  updateCharacter: (id: number, data: {
    name: string;
    description: string;
    age?: number;
    gender?: string;
    worldId: number;
    eraId?: number;
  }, token: string) => {
    return request<{
      id: number;
      name: string;
      description: string;
      age: number;
      gender: string;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 删除角色
  deleteCharacter: (id: number, token: string) => {
    return request<void>(`/characters/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

// 剧本相关API
export const scriptApi = {
  // 获取所有剧本
  getAllScripts: (token: string) => {
    return request<Array<{
      id: number;
      title: string;
      content: string;
      sceneCount: number;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>('/scripts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取指定世界的所有剧本
  getScriptsByWorldId: (worldId: number, token: string) => {
    return request<Array<{
      id: number;
      title: string;
      content: string;
      sceneCount: number;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/scripts/world/${worldId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 获取指定时代的所有剧本
  getScriptsByEraId: (eraId: number, token: string) => {
    return request<Array<{
      id: number;
      title: string;
      content: string;
      sceneCount: number;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>>(`/scripts/era/${eraId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 创建剧本
  createScript: (data: {
    title: string;
    content: string;
    sceneCount?: number;
    worldId: number;
    eraId?: number;
  }, token: string) => {
    return request<{
      id: number;
      title: string;
      content: string;
      sceneCount: number;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>('/scripts', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 更新剧本
  updateScript: (id: number, data: {
    title: string;
    content: string;
    sceneCount?: number;
    worldId: number;
    eraId?: number;
  }, token: string) => {
    return request<{
      id: number;
      title: string;
      content: string;
      sceneCount: number;
      worldId: number;
      eraId: number;
      createdAt: string;
      updatedAt: string;
    }>(`/scripts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // 删除剧本
  deleteScript: (id: number, token: string) => {
    return request<void>(`/scripts/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};



// 存储和获取token
export const tokenStorage = {
  // 保存token
  saveToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },

  // 获取token
  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  // 移除token
  removeToken: () => {
    localStorage.removeItem('auth_token');
  },
};
