
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { apiService } from '../services/api';

interface LoginModalProps {
  onLoginSuccess: (method: 'phone' | 'wechat', identifier: string) => void;
  onCancel: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'wechat'>('login');
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register State
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');
  const [registerAvatarUrl, setRegisterAvatarUrl] = useState('https://example.com/avatar.jpg');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // WeChat State
  const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'scanned'>('loading');

  useEffect(() => {
    if (activeTab === 'wechat') {
        // Simulate QR loading
        const t = setTimeout(() => setQrStatus('ready'), 800);
        return () => clearTimeout(t);
    }
  }, [activeTab]);

  const handleLoginSubmit = async () => {
      if (!username || !password) {
          setError('请输入用户名和密码');
          return;
      }
      setIsLoading(true);
      setError('');
      try {
          const response = await apiService.login({ username, password });
          onLoginSuccess('phone', response.id);
      } catch (err) {
          setError(err instanceof Error ? err.message : '登录失败');
      } finally {
          setIsLoading(false);
      }
  };

  const handleRegisterSubmit = async () => {
      if (!registerUsername || !registerPassword || !registerEmail || !registerNickname) {
          setRegisterError('请填写所有必填字段');
          return;
      }
      setIsRegistering(true);
      setRegisterError('');
      try {
          const response = await apiService.register({
              username: registerUsername,
              password: registerPassword,
              email: registerEmail,
              nickname: registerNickname,
              avatarUrl: registerAvatarUrl
          });
          onLoginSuccess('phone', response.id);
      } catch (err) {
          setRegisterError(err instanceof Error ? err.message : '注册失败');
      } finally {
          setIsRegistering(false);
      }
  };

  const handleSimulateScan = () => {
      setQrStatus('scanned');
      setTimeout(() => {
          onLoginSuccess('wechat', 'wx_user_' + Date.now());
      }, 1000);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="p-8 pb-4 text-center">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-400">
                身份连接
            </h2>
            <p className="text-sm text-slate-400 mt-2">绑定身份以保存记忆、解锁心域全部功能。</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 mx-8">
            <button 
                onClick={() => setActiveTab('login')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'login' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                登录
            </button>
            <button 
                onClick={() => setActiveTab('register')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'register' ? 'text-white border-b-2 border-purple-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                注册
            </button>
            <button 
                onClick={() => setActiveTab('wechat')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'wechat' ? 'text-white border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                微信登录
            </button>
        </div>

        <div className="p-8 pt-6">
            {/* Login Tab */}
            {activeTab === 'login' && (
                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">用户名</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="请输入用户名"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-pink-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">密码</label>
                         <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="请输入密码"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-pink-500 outline-none transition-all"
                        />
                    </div>
                    
                    {error && <p className="text-red-400 text-xs text-center animate-pulse">{error}</p>}

                    <Button 
                        onClick={handleLoginSubmit} 
                        fullWidth 
                        className="bg-gradient-to-r from-pink-500 to-indigo-600 shadow-lg shadow-indigo-500/20 mt-2"
                        disabled={isLoading}
                    >
                        {isLoading ? '登录中...' : '登录'}
                    </Button>
                </div>
            )}

            {/* Register Tab */}
            {activeTab === 'register' && (
                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">用户名</label>
                        <input 
                            type="text" 
                            value={registerUsername}
                            onChange={e => setRegisterUsername(e.target.value)}
                            placeholder="请输入用户名"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-purple-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">密码</label>
                         <input 
                            type="password" 
                            value={registerPassword}
                            onChange={e => setRegisterPassword(e.target.value)}
                            placeholder="请输入密码"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-purple-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">邮箱</label>
                         <input 
                            type="email" 
                            value={registerEmail}
                            onChange={e => setRegisterEmail(e.target.value)}
                            placeholder="请输入邮箱"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-purple-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">昵称</label>
                         <input 
                            type="text" 
                            value={registerNickname}
                            onChange={e => setRegisterNickname(e.target.value)}
                            placeholder="请输入昵称"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-purple-500 outline-none transition-all"
                        />
                    </div>
                    
                    {registerError && <p className="text-red-400 text-xs text-center animate-pulse">{registerError}</p>}

                    <Button 
                        onClick={handleRegisterSubmit} 
                        fullWidth 
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-indigo-500/20 mt-2"
                        disabled={isRegistering}
                    >
                        {isRegistering ? '注册中...' : '注册'}
                    </Button>
                </div>
            )}

            {/* WeChat Tab */}
            {activeTab === 'wechat' && (
                <div className="flex flex-col items-center justify-center space-y-6 py-4">
                    <div className={`w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center relative transition-all ${qrStatus === 'scanned' ? 'opacity-50 blur-sm' : 'opacity-100'}`}>
                        {qrStatus === 'loading' ? (
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-green-500 rounded-full animate-spin" />
                        ) : (
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=HeartSphere_Login_Sim" alt="QR Code" className="w-full h-full" />
                        )}
                        
                        {qrStatus === 'scanned' && (
                             <div className="absolute inset-0 flex items-center justify-center z-10">
                                 <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                 </div>
                             </div>
                        )}
                    </div>
                    
                    <div className="text-center">
                        <p className="text-white font-bold mb-1">
                            {qrStatus === 'scanned' ? '扫描成功' : '微信扫码以连接'}
                        </p>
                        <p className="text-slate-500 text-xs">
                            {qrStatus === 'scanned' ? '正在同步您的心域数据...' : '安全、快捷、无需记忆密码'}
                        </p>
                    </div>

                    {/* Simulation Button for Web Demo */}
                    <button 
                        onClick={handleSimulateScan}
                        disabled={qrStatus !== 'ready'}
                        className="text-xs text-slate-600 hover:text-green-400 underline"
                    >
                        [模拟手机扫码]
                    </button>
                </div>
            )}
        </div>
        
        <div className="bg-slate-950 p-4 text-center border-t border-slate-800">
             <p className="text-[10px] text-slate-600">
                 登录即代表您同意 <span className="text-indigo-400 cursor-pointer hover:underline">《心域用户协议》</span> 及 <span className="text-indigo-400 cursor-pointer hover:underline">《隐私政策》</span>
             </p>
        </div>
      </div>
    </div>
  );
};
