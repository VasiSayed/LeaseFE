import React, { useState } from "react";
import { Mail, Lock, LogIn, ArrowLeft, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const Login = ({ onClose }) => {
  const { login } = useAuth();

  const [loginType, setLoginType] = useState("credentials"); // 'credentials' or 'otp'
  const [step, setStep] = useState("email"); // 'email' or 'otp'

  // ✅ Credentials login state (email + password)
  const [emailCred, setEmailCred] = useState("");
  const [password, setPassword] = useState("");

  // OTP login state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ✅ Email/Password Login
const handleCredentialsSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setMessage("");
  setLoading(true);

  try {
    const res = await authAPI.loginWithCredentials(emailCred, password);

    // res already contains user + scope_tree (as you showed)
    login(res.user, res.scope_tree);

    if (onClose) onClose();
  } catch (err) {
    setError(err?.message || "Invalid email or password. Please try again.");
  } finally {
    setLoading(false);
  }
};


  // OTP Request
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await authAPI.requestOTP(email);
      setMessage("OTP has been sent to your email. Please check your inbox.");
      setStep("otp");
    } catch (err) {
      setError(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // OTP Verify
const handleOTPSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setMessage("");
  setLoading(true);

  try {
    const res = await authAPI.verifyOTP(email, otp);
    login(res.user, res.scope_tree);

    if (onClose) onClose();
  } catch (err) {
    setError(err?.message || "Invalid OTP. Please try again.");
  } finally {
    setLoading(false);
  }
};



  const handleBack = () => {
    setStep("email");
    setOtp("");
    setError("");
    setMessage("");
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    setStep("email");
    setError("");
    setMessage("");
    setEmailCred("");
    setPassword("");
    setEmail("");
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {loginType === "credentials"
                ? "Sign in with your email and password"
                : step === "email"
                ? "Enter your email to receive an OTP"
                : "Enter the OTP sent to your email"}
            </p>

            <div className="flex items-center justify-center border-b border-gray-200">
              <button
                type="button"
                onClick={() => switchLoginType("credentials")}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  loginType === "credentials"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                Email/Password
              </button>
              <button
                type="button"
                onClick={() => switchLoginType("otp")}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  loginType === "otp"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                OTP Login
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}

          {/* ✅ Email/Password Form */}
          {loginType === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="emailCred"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emailCred"
                    type="email"
                    value={emailCred}
                    onChange={(e) => setEmailCred(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP Email Step */}
          {loginType === "otp" && step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP Verification Step */}
          {loginType === "otp" && step === "otp" && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Enter OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    maxLength={6}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  OTP sent to <span className="font-medium">{email}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Verify & Login</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
