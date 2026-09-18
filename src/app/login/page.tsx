"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Globe, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { triggerHaptic } from "@/lib/haptics";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const supabase = createClient();

  useEffect(() => {
    // Check saved theme
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }

    if (urlError === "disabled") {
      setErrorMessage(
        lang === "ar"
          ? "هذا الحساب معطل حالياً. يرجى مراجعة إدارة المنشأة."
          : "This account has been deactivated. Please contact the facility administration."
      );
    }
  }, [urlError, lang]);

  const toggleTheme = () => {
    triggerHaptic("selection");
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleLanguage = () => {
    triggerHaptic("selection");
    setLang(lang === "ar" ? "en" : "ar");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage(lang === "ar" ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter email and password");
      triggerHaptic("warning");
      return;
    }

    setIsLoading(true);
    triggerHaptic("light");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        triggerHaptic("error");
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setErrorMessage(
            lang === "ar"
              ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
              : "Invalid email or password"
          );
        } else if (msg.includes("failed to fetch") || msg.includes("network")) {
          setErrorMessage(
            lang === "ar"
              ? "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت وتحديث الصفحة"
              : "Unable to connect to server. Please check your internet connection and refresh the page."
          );
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // 1. Check if user is a tenant member/admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active, role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile) {
          if (!profile.is_active) {
            triggerHaptic("error");
            await supabase.auth.signOut();
            setErrorMessage(
              lang === "ar"
                ? "هذا الحساب معطل حالياً. يرجى مراجعة إدارة المنشأة."
                : "This account has been deactivated. Please contact the facility administration."
            );
            setIsLoading(false);
            return;
          }

          triggerHaptic("success");
          const target = redirectTo !== "/" ? redirectTo : (profile.role === "admin" || profile.role === "security" ? "/admin" : "/");
          router.push(target);
          router.refresh();
          return;
        }

        // 2. Check if user is a Platform Admin
        const { data: platformAdmin } = await supabase
          .from("platform_admins")
          .select("role, is_active")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (platformAdmin) {
          if (!platformAdmin.is_active) {
            triggerHaptic("error");
            await supabase.auth.signOut();
            setErrorMessage(
              lang === "ar"
                ? "تم تعطيل حساب مسؤول المنصة. يرجى مراجعة إدارة النظام."
                : "Platform Administrator account has been deactivated."
            );
            setIsLoading(false);
            return;
          }

          triggerHaptic("success");
          const target = redirectTo !== "/" ? redirectTo : "/platform";
          router.push(target);
          router.refresh();
          return;
        }

        // 3. User authenticated in Supabase auth but has neither profile nor platform_admin record
        triggerHaptic("error");
        await supabase.auth.signOut();
        setErrorMessage(
          lang === "ar"
            ? "لا يوجد ملف تعريفي مصرح مرتبط بهذا الحساب."
            : "No authorized profile associated with this account."
        );
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      triggerHaptic("error");
      setErrorMessage(
        lang === "ar"
          ? "حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً"
          : "Network error occurred, please try again later"
      );
      setIsLoading(false);
    }
  };

  const isAr = lang === "ar";

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="flex min-h-screen flex-col justify-between bg-slate-50 pt-safe pb-safe dark:bg-slate-950 transition-colors"
    >
      {/* Top Header: Switch Language & Dark Mode */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-qatar text-white shadow-md shadow-qatar/20">
            <Car className="h-5 w-5" />
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white font-arabic">
            {isAr ? "حَرِّك | HARRIK" : "HARRIK | حَرِّك"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition active:scale-90 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            <Globe className="h-3.5 w-3.5 text-qatar" />
            <span>{isAr ? "English" : "عربي"}</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition active:scale-90 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
          >
            {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="mx-auto w-full max-w-md px-6 py-6 sm:py-8">
        {/* Brand Card Hero */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-qatar text-white shadow-xl shadow-qatar/30 ring-4 ring-qatar/10">
            <Car className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-arabic">
            {isAr ? "أهلاً بك" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isAr ? "سجّل الدخول للمتابعة إلى منظومة حَرِّك" : "Sign in to continue to HARRIK Platform"}
          </p>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-qatar">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isAr ? "بوابة الكيان الآمنة" : "Secure Organization Gateway"}</span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full rounded-2xl border border-slate-200 bg-white ps-10 pe-4 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-white ps-10 pe-12 py-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-qatar focus:outline-none focus:ring-2 focus:ring-qatar/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("selection");
                  setShowPassword(!showPassword);
                }}
                className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-qatar py-4 text-sm font-bold text-white shadow-lg shadow-qatar/25 transition active:scale-95 hover:bg-qatar-900 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{isAr ? "جاري تسجيل الدخول..." : "Signing in..."}</span>
              </>
            ) : (
              <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
            )}
          </button>
        </form>

        {/* Internal Organization Note */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>
            {isAr
              ? "منظومة مصرحة للأفراد وكادر المنشأة • الدخول بحساب معتمد"
              : "Authorized enterprise portal • Verified credentials only"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-[11px] text-slate-400">
        حَرِّك | HARRIK Smart Parking • Qatar Edition
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-qatar" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
