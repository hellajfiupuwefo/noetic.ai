import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Inbox,
  School,
  GraduationCap,
  ExternalLink,
  Send,
  Copy,
  Check,
  Settings,
  HelpCircle,
  Brain,
  BookOpen,
  Microscope,
  Dna,
  Rocket,
  Code2,
  Lightbulb,
  PenTool,
  Activity
} from 'lucide-react';
import { UserAccount, AuthResponse, VerificationInboxMessage, EmailDeliveryInfo } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'verify' | 'forgot';
  initialEmail?: string;
  onAuthSuccess: (user: UserAccount, token: string) => void;
}

const ARCHETYPE_OPTIONS = [
  { id: 'scholar', label: 'Scholar', icon: GraduationCap },
  { id: 'thinker', label: 'Thinker', icon: Brain },
  { id: 'reader', label: 'Reader', icon: BookOpen },
  { id: 'scientist', label: 'Scientist', icon: Microscope },
  { id: 'bio', label: 'Bio', icon: Dna },
  { id: 'explorer', label: 'Explorer', icon: Rocket },
  { id: 'coder', label: 'Coder', icon: Code2 },
  { id: 'innovator', label: 'Innovator', icon: Lightbulb },
  { id: 'writer', label: 'Writer', icon: PenTool },
  { id: 'medical', label: 'Medical', icon: Activity }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  initialEmail = '',
  onAuthSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'verify' | 'forgot'>(initialTab);
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regInstitution, setRegInstitution] = useState('');
  const [regMajor, setRegMajor] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'educator' | 'researcher'>('student');
  const [regAvatar, setRegAvatar] = useState('scholar');

  // Verification PIN form state (6 digits)
  const [verifyIdentifier, setVerifyIdentifier] = useState(initialEmail);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(15 * 60);
  const [isSentViaSmtp, setIsSentViaSmtp] = useState<boolean>(false);
  const [emailDelivery, setEmailDelivery] = useState<EmailDeliveryInfo | null>(null);
  const [showEmailDiagnostics, setShowEmailDiagnostics] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ activeProvider: string; isLiveConfigured: boolean } | null>(null);

  // Forgot / Reset Password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Status and feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      if (initialEmail) {
        setVerifyIdentifier(initialEmail);
        setForgotIdentifier(initialEmail);
      }
      setErrorMessage(null);
      setSuccessMessage(null);

      // Fetch active email service configuration status
      fetch('/api/auth/email-service-status')
        .then(res => res.json())
        .then(data => setEmailStatus(data))
        .catch(() => {});
    }
  }, [isOpen, initialTab, initialEmail]);


  // Password Strength evaluation
  const evaluatePasswordStrength = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[^A-Za-z0-9]/.test(pwd)
    };
    const passedCount = Object.values(checks).filter(Boolean).length;
    let label = 'Very Weak';
    let color = 'bg-rose-500';
    let percent = 20;

    if (passedCount >= 5) {
      label = 'Strong';
      color = 'bg-emerald-500';
      percent = 100;
    } else if (passedCount >= 4) {
      label = 'Good';
      color = 'bg-indigo-500';
      percent = 80;
    } else if (passedCount >= 3) {
      label = 'Fair';
      color = 'bg-amber-500';
      percent = 60;
    } else if (passedCount >= 2) {
      label = 'Weak';
      color = 'bg-amber-600';
      percent = 40;
    }

    return { checks, passedCount, label, color, percent };
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword
        })
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (data.requiresVerification) {
        setVerifyIdentifier(data.email || loginIdentifier.trim());
        setTab('verify');
        setExpiresInSeconds(15 * 60);
        if (data.sentViaSmtp !== undefined) {
          setIsSentViaSmtp(Boolean(data.sentViaSmtp));
        }
        if (data.delivery) {
          setEmailDelivery(data.delivery);
        }
        setSuccessMessage('Account requires email verification. Enter the 6-digit PIN below.');
        return;
      }

      if (data.token && data.user) {
        localStorage.setItem('noetic_auth_token', data.token);
        onAuthSuccess(data.user, data.token);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Guest Explorer Mode (Clear separation from real verified accounts)
  const handleExploreAsGuest = () => {
    const guestUser: UserAccount = {
      id: `guest-${Date.now()}`,
      username: 'Guest Scholar',
      email: 'guest@noetic.local',
      avatar: 'scholar',
      institution: 'Independent Scholar',
      major: 'Exploratory Study',
      role: 'student',
      studyGoal: 'Master curriculum concepts',
      isVerified: true,
      isGuest: true,
      createdAt: Date.now()
    };
    const guestToken = 'guest-session-token';
    try {
      localStorage.setItem('noetic_auth_token', guestToken);
      localStorage.setItem('noetic_user_account', JSON.stringify(guestUser));
    } catch {}
    onAuthSuccess(guestUser, guestToken);
    onClose();
  };

  // Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim();

    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMessage('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid academic or personal email address.');
      return;
    }

    const strength = evaluatePasswordStrength(regPassword);
    if (strength.passedCount < 3) {
      setErrorMessage('Please choose a stronger password with at least 8 characters including numbers and letters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter to confirm.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: regPassword,
          institution: regInstitution.trim() || 'Stanford University',
          major: regMajor.trim() || 'Cognitive Sciences',
          role: regRole,
          avatar: regAvatar
        })
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Registration failed.');
      }

      setVerifyIdentifier(cleanEmail);
      setTab('verify');
      setResendCooldown(30);
      setExpiresInSeconds(15 * 60);
      if (data.sentViaSmtp !== undefined) {
        setIsSentViaSmtp(Boolean(data.sentViaSmtp));
      }
      if (data.delivery) {
        setEmailDelivery(data.delivery);
      }
      setSuccessMessage(data.message || `Account created! Verification code dispatched to ${cleanEmail}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // PIN Input Handling
  const handlePinChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...pinDigits];

    if (cleaned.length === 0) {
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    // Single digit input
    if (cleaned.length === 1) {
      newDigits[index] = cleaned;
      setPinDigits(newDigits);
      if (index < 5) {
        pinInputRefs.current[index + 1]?.focus();
      }
      // If all 6 digits are now filled, auto submit
      if (newDigits.every(d => d.length === 1)) {
        setTimeout(() => {
          handleVerifySubmit(undefined, newDigits.join(''));
        }, 120);
      }
      return;
    }

    // Pasted multiple digits
    const digitsArray = cleaned.slice(0, 6).split('');
    digitsArray.forEach((d, i) => {
      if (index + i < 6) {
        newDigits[index + i] = d;
      }
    });
    setPinDigits(newDigits);
    const nextIndex = Math.min(5, index + digitsArray.length);
    pinInputRefs.current[nextIndex]?.focus();
    if (newDigits.every(d => d.length === 1)) {
      setTimeout(() => {
        handleVerifySubmit(undefined, newDigits.join(''));
      }, 120);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    pasted.split('').forEach((digit, i) => {
      newDigits[i] = digit;
    });
    setPinDigits(newDigits);
    pinInputRefs.current[Math.min(5, pasted.length - 1)]?.focus();
    if (newDigits.every(d => d.length === 1)) {
      setTimeout(() => {
        handleVerifySubmit(undefined, newDigits.join(''));
      }, 120);
    }
  };



  // Submit 6-digit Verification
  const handleVerifySubmit = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullCode = overrideCode || pinDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    if (!verifyIdentifier.trim()) {
      setErrorMessage('Please provide your account username or email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: verifyIdentifier.trim(),
          code: fullCode
        })
      });

      const data: AuthResponse = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Verification failed.');
      }

      setSuccessMessage('🎉 Account verified successfully!');
      if (data.token && data.user) {
        localStorage.setItem('noetic_auth_token', data.token);
        setTimeout(() => {
          onAuthSuccess(data.user!, data.token!);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect verification code. Please check your email inbox.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Verification Code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verifyIdentifier.trim()) {
      setErrorMessage('Missing email or username.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: verifyIdentifier.trim() })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      if (data.sentViaSmtp !== undefined) {
        setIsSentViaSmtp(Boolean(data.sentViaSmtp));
      }
      if (data.delivery) {
        setEmailDelivery(data.delivery);
      }

      setResendCooldown(60);
      setExpiresInSeconds(15 * 60);
      setSuccessMessage(data.message || `A fresh verification code has been dispatched to ${verifyIdentifier.trim()}.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotIdentifier.trim()) {
      setErrorMessage('Please enter your account email or username.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send reset code.');
      }


      if (data.sentViaSmtp !== undefined) {
        setIsSentViaSmtp(Boolean(data.sentViaSmtp));
      }
      if (data.delivery) {
        setEmailDelivery(data.delivery);
      }
      setResetStep(2);
      setSuccessMessage(`Reset code dispatched to ${data.email || forgotIdentifier}. Check your email.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password submit
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (resetCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit reset code.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          code: resetCode.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccessMessage('Password reset successfully! You can now log in.');
      setTimeout(() => {
        setTab('login');
        setLoginIdentifier(forgotIdentifier);
        setLoginPassword(newPassword);
        setResetStep(1);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(regPassword);
  const minutesLeft = Math.floor(expiresInSeconds / 60);
  const secondsLeft = expiresInSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-2xl theme-bg-surface theme-border border shadow-2xl overflow-hidden animate-scaleIn transition-colors flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xl shadow-inner border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-bold theme-text-primary flex items-center gap-2">
                <span>Account Security &amp; Auth</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold uppercase tracking-wider">
                  2FA Verified
                </span>
              </h2>
              <p className="text-xs theme-text-secondary">
                Secure credentials and two-factor email verification codes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b theme-border bg-slate-900/30 text-xs font-semibold">
          <button
            onClick={() => { setTab('login'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/5'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => { setTab('register'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'register'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/5'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>

          <button
            onClick={() => { setTab('verify'); setErrorMessage(null); }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              tab === 'verify'
                ? 'border-indigo-500 text-indigo-400 font-bold bg-indigo-500/5'
                : 'border-transparent theme-text-secondary hover:theme-text-primary'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Code</span>
          </button>
        </div>

        {/* Toast Alerts */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">

          {/* ==================== TAB 1: LOGIN ==================== */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-primary mb-1.5">
                  Username or Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. alexchen or scholar@stanford.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold theme-text-primary">
                    Secure Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setForgotIdentifier(loginIdentifier); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Explore as Guest Option */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold theme-text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Explore as Guest</span>
                  </div>
                  <div className="text-[11px] theme-text-muted mt-0.5">
                    Test note upload and adaptive study without signing up
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExploreAsGuest}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs transition-colors cursor-pointer border border-indigo-500/30"
                >
                  Enter as Guest
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In Securely</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs theme-text-muted">Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => { setTab('register'); setErrorMessage(null); }}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  Create verified account
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 2: REGISTER ==================== */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-primary mb-1">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. maria_curie"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                      required
                    />
                  </div>
                  <span className="text-[10px] theme-text-muted mt-0.5 block">
                    Letters, numbers, underscores (min 3 chars)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-primary mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="scholar@university.edu"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                      required
                    />
                  </div>
                  <span className="text-[10px] theme-text-muted mt-0.5 block">
                    6-digit code sent here
                  </span>
                </div>
              </div>

              {/* Password & Strength Meter */}
              <div>
                <label className="block text-xs font-semibold theme-text-primary mb-1">
                  Secure Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 8 characters with numbers & symbols"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {regPassword.length > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-900/40 border theme-border space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="theme-text-muted">Password Strength:</span>
                      <span className={`font-semibold ${
                        strength.passedCount >= 4 ? 'text-emerald-400' : strength.passedCount >= 3 ? 'text-indigo-400' : 'text-amber-400'
                      }`}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${strength.color}`} 
                        style={{ width: `${strength.percent}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] theme-text-muted pt-1">
                      <div className={`flex items-center gap-1 ${strength.checks.length ? 'text-emerald-400' : ''}`}>
                        <CheckCircle2 className="w-3 h-3" /> 8+ Characters
                      </div>
                      <div className={`flex items-center gap-1 ${strength.checks.uppercase ? 'text-emerald-400' : ''}`}>
                        <CheckCircle2 className="w-3 h-3" /> Uppercase letter
                      </div>
                      <div className={`flex items-center gap-1 ${strength.checks.number ? 'text-emerald-400' : ''}`}>
                        <CheckCircle2 className="w-3 h-3" /> Contains number
                      </div>
                      <div className={`flex items-center gap-1 ${strength.checks.symbol ? 'text-emerald-400' : ''}`}>
                        <CheckCircle2 className="w-3 h-3" /> Special symbol
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-primary mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    required
                  />
                </div>
              </div>

              {/* Institution & Major & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold theme-text-primary mb-1">
                    Institution
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={regInstitution}
                      onChange={(e) => setRegInstitution(e.target.value)}
                      placeholder="e.g. Stanford University"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-primary mb-1">
                    Major / Department
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={regMajor}
                      onChange={(e) => setRegMajor(e.target.value)}
                      placeholder="e.g. Molecular Biology"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold theme-text-primary mb-1.5">
                  Academic Scholar Archetype
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ARCHETYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = regAvatar === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRegAvatar(opt.id)}
                        title={opt.label}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white scale-110 shadow-md ring-2 ring-indigo-400'
                            : 'theme-bg-elevated hover:scale-105 opacity-80 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create &amp; Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs theme-text-muted">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => { setTab('login'); setErrorMessage(null); }}
                  className="text-xs font-semibold text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ==================== TAB 3: VERIFICATION CODE ==================== */}
          {tab === 'verify' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-1 shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold theme-text-primary">
                  Confirm Your Email Address
                </h3>
                <p className="text-xs theme-text-secondary max-w-sm mx-auto leading-relaxed">
                  We sent a 6-digit confirmation code to{' '}
                  <span className="font-semibold text-indigo-400 font-mono">
                    {verifyIdentifier || 'your email'}
                  </span>. Enter it below to activate your account.
                </p>

                {/* Delivery Provider Badge */}
                <div className="pt-1 flex items-center justify-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {emailDelivery?.provider 
                        ? `Dispatched via ${emailDelivery.provider}` 
                        : isSentViaSmtp 
                          ? 'Dispatched via Live SMTP' 
                          : emailStatus?.activeProvider 
                            ? `Dispatched via ${emailStatus.activeProvider}` 
                            : 'Email Dispatched'}
                    </span>
                  </span>

                  {emailDelivery?.previewUrl && (
                    <a
                      href={emailDelivery.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Web Mailbox</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Verification Email Dispatched Notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3 text-xs">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-indigo-300">6-Digit verification code dispatched</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    We sent a secure 6-digit code to <span className="font-mono text-slate-200 font-medium">{verifyIdentifier}</span>. Enter the code below to activate your account.
                  </p>
                </div>
              </div>

              {/* Verification Code Segmented Inputs */}
              <div className="pt-1">
                <label className="block text-xs font-semibold theme-text-primary text-center mb-2.5">
                  Enter 6-Digit PIN
                </label>
                <div 
                  className="flex items-center justify-center gap-2 sm:gap-3"
                  onPaste={handlePasteCode}
                >
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { pinInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl theme-bg-elevated theme-border border-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none theme-text-primary transition-all shadow-inner"
                      placeholder="•"
                    />
                  ))}
                </div>
              </div>

              {/* Expiration Countdown & Resend Button */}
              <div className="flex items-center justify-between text-xs px-2 pt-1">
                <span className="theme-text-muted">
                  Code expires in:{' '}
                  <span className="font-mono font-bold text-amber-400">
                    {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isLoading}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </span>
                </button>
              </div>

              {/* Verification Submit Button */}
              <button
                type="button"
                onClick={() => handleVerifySubmit()}
                disabled={isLoading || pinDigits.join('').length !== 6}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify &amp; Activate Account</span>
                  </>
                )}
              </button>

              {/* Email Delivery Diagnostics & Live Testing Tool */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowEmailDiagnostics(!showEmailDiagnostics)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 text-[11px] theme-text-secondary transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Email Service &amp; Deliverability Diagnostics</span>
                  </span>
                  <span className="text-indigo-400 font-mono text-[10px]">
                    {showEmailDiagnostics ? 'Hide ▲' : 'Show Details ▼'}
                  </span>
                </button>

                {showEmailDiagnostics && (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 space-y-3 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Active Provider:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        {emailDelivery?.provider || emailStatus?.activeProvider || 'Development Sandbox'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400">Target Recipient:</span>
                      <span className="font-mono text-slate-200 truncate max-w-[180px]">
                        {verifyIdentifier || 'No email specified'}
                      </span>
                    </div>

                    {emailDelivery?.previewUrl && (
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Ethereal Inbox Link:</span>
                        <a
                          href={emailDelivery.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>View HTML Email</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}


                    <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
                      <p>
                        📬 If using Gmail or Outlook, please check your Spam or Promotions folder if not in Primary within 30 seconds.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-xs theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: FORGOT PASSWORD ==================== */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold theme-text-primary">
                  Reset Password with Verification Code
                </h3>
                <p className="text-xs theme-text-secondary">
                  {resetStep === 1
                    ? 'Enter your account username or email to receive a 6-digit reset code.'
                    : 'Enter the 6-digit code dispatched to your email and select your new password.'}
                </p>
              </div>

              {resetStep === 1 ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold theme-text-primary mb-1">
                      Account Username or Email
                    </label>
                    <input
                      type="text"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      placeholder="e.g. alexchen or scholar@stanford.edu"
                      className="w-full px-3 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Send Reset Code</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold theme-text-primary mb-1">
                      6-Digit Reset Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 592810"
                        className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary text-center"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold theme-text-primary mb-1">
                      New Secure Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-3 pr-10 py-2 text-xs rounded-xl theme-bg-elevated theme-border border focus:ring-2 focus:ring-indigo-500 focus:outline-none theme-text-primary"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Password &amp; Finish</span>}
                  </button>
                </form>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setResetStep(1); }}
                  className="text-xs theme-text-muted hover:theme-text-primary transition-colors cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
