
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface LoginModalProps {
  onLoginSuccess: (method: 'phone' | 'wechat', identifier: string) => void;
  onCancel: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'phone' | 'wechat'>('phone');
  
  // Phone State
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  // WeChat State
  const [qrStatus, setQrStatus] = useState<'loading' | 'ready' | 'scanned'>('loading');

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (activeTab === 'wechat') {
        // Simulate QR loading
        const t = setTimeout(() => setQrStatus('ready'), 800);
        return () => clearTimeout(t);
    }
  }, [activeTab]);

  const handleSendCode = () => {
    if (!phone || phone.length < 11) {
        setError('请输入有效的手机号码');
        return;
    }
    setIsSending(true);
    setError('');
    // Simulate API call
    setTimeout(() => {
        setIsSending(false);
        setCountdown(60);
        alert(`【HeartSphere】验证码：8842。您正在进行身份连接，请勿告知他人。`);
    }, 1000);
  };

  const handlePhoneSubmit = () => {
      if (!phone || !code) return;
      if (code !== '8842' && code !== '1234') { // Simple mock validation
          setError('验证码错误');
          return;
      }
      onLoginSuccess('phone', phone);
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
                onClick={() => setActiveTab('phone')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'phone' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                手机号登录
            </button>
            <button 
                onClick={() => setActiveTab('wechat')}
                className={`flex-1 pb-3 text-sm font-bold transition-colors ${activeTab === 'wechat' ? 'text-white border-b-2 border-green-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                微信快速登录
            </button>
        </div>

        <div className="p-8 pt-6">
            {activeTab === 'phone' && (
                <div className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">手机号</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">+86</span>
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="请输入手机号"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-12 pr-4 text-white focus:border-pink-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 uppercase">验证码</label>
                         <div className="flex gap-3">
                             <input 
                                type="text" 
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="4位验证码"
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-pink-500 outline-none transition-all text-center tracking-widest"
                                maxLength={4}
                            />
                            <button 
                                onClick={handleSendCode}
                                disabled={countdown > 0 || isSending}
                                className={`w-32 rounded-lg text-xs font-bold transition-all ${
                                    countdown > 0 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                {isSending ? '发送中...' : countdown > 0 ? `${countdown}s 后重试` : '获取验证码'}
                            </button>
                         </div>
                    </div>
                    
                    {error && <p className="text-red-400 text-xs text-center animate-pulse">{error}</p>}

                    <Button onClick={handlePhoneSubmit} fullWidth className="bg-gradient-to-r from-pink-500 to-indigo-600 shadow-lg shadow-indigo-500/20 mt-2">
                        确认并连接
                    </Button>
                </div>
            )}

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
