import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MorphingBlob from "@/components/blob";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useLocation } from "wouter";
import { useForm } from "@/hooks/useForm";
import { validateLoginForm, getFieldError, hasFieldError } from "@/lib/validation";
import { useState } from "react";
import { showSuccessToast, showFormSubmitErrorToast } from "@/lib/toast";
import { ApiError, apiRequest } from "@/lib/api";

/**
 * ALEXZA AI Login Page
 * Design: Monochrome metallic theme
 * - Form validation with inline errors
 * - Loading states on submit
 * - Success feedback
 */

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<LoginFormData>({
    initialValues: {
      email: "",
      password: "",
    },
    validate: validateLoginForm,
    onSubmit: async (values) => {
      try {
        await apiRequest<{ ok: true; user: { id: string; email: string; name: string } }>(
          "/api/auth/login",
          {
            method: "POST",
            body: {
              email: values.email,
              password: values.password,
            },
          }
        );
        showSuccessToast("Welcome back!", "You have been logged in successfully");
        setSubmitSuccess(true);
        const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        const nextPath = params.get("next") || params.get("redirect") || "/app/dashboard";
        setTimeout(() => {
          setLocation(nextPath.startsWith("/") ? nextPath : "/app/dashboard");
        }, 500);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401) {
            showFormSubmitErrorToast("Invalid credentials");
            return;
          }
          showFormSubmitErrorToast(error.message);
          return;
        }
        showFormSubmitErrorToast("Unable to sign in");
      }
    },
  });

  return (
    <div className="min-h-screen text-foreground flex flex-col items-center justify-center px-4 relative overflow-hidden bg-carbon-hex">
      {/* Back button + Language */}
      <div className="fixed top-6 left-6 right-6 z-50 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={20} />
          <span>{t("navigation.backToHome")}</span>
        </a>
        <LanguageSwitcher />
      </div>

      <motion.div
        className="w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="text-center mb-8" variants={itemVariants}>
          <div className="flex justify-center mb-6 cursor-pointer select-none">
            <MorphingBlob
              size={120}
              intensity={0.7}
              colorAccent="#c0c0c0"
              idleSpeed={0.55}
              hoverStrength={0.9}
              glowStrength={1.2}
              glowColor="#22c55e"
              chaosLevel={0.9}
              burstMode={true}
              spinSpeed={2.5}
              tightness={0.72}
              extraSpheres={6}
            />
          </div>
          <h1 className="hero-title-gradient font-brand text-3xl font-extrabold tracking-tight">{t("auth.login.title")}</h1>
          <p className="text-gray-400 mt-2">{t("auth.login.welcomeBack")}</p>
        </motion.div>

        {/* Form card */}
        <motion.div className="rounded-2xl p-6 lg:p-8 code-block-carbon border border-[rgba(255,255,255,0.12)]" variants={itemVariants}>
        {/* Success Message */}
        {submitSuccess && (
          <motion.div
            className="mb-6 p-4 rounded-lg bg-[#c0c0c0]/10 border border-[#c0c0c0]/30 flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle size={20} className="text-[#c0c0c0]" />
            <p className="text-sm text-[#c0c0c0]">{t("auth.login.loginSuccess")}</p>
          </motion.div>
        )}

        {/* Form */}
        <motion.form onSubmit={form.handleSubmit} className="space-y-6" variants={itemVariants}>
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("auth.login.email")}</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="email"
                name="email"
                value={form.values.email}
                onChange={form.handleChange}
                placeholder="you@example.com"
                disabled={form.isSubmitting}
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border transition text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[rgba(192,192,192,0.3)] focus:ring-offset-2 focus:ring-offset-[#050607] ${
                  hasFieldError(form.errors, "email")
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/30"
                    : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.2)]"
                } disabled:opacity-50`}
              />
            </div>
            {hasFieldError(form.errors, "email") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "email")}</p>
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">{t("auth.login.password")}</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="password"
                name="password"
                value={form.values.password}
                onChange={form.handleChange}
                placeholder="••••••••"
                disabled={form.isSubmitting}
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border transition text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[rgba(192,192,192,0.3)] focus:ring-offset-2 focus:ring-offset-[#050607] ${
                  hasFieldError(form.errors, "password")
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/30"
                    : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.2)]"
                } disabled:opacity-50`}
              />
            </div>
            {hasFieldError(form.errors, "password") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "password")}</p>
              </div>
            )}
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input type="checkbox" className="rounded" disabled={form.isSubmitting} />
              {t("auth.login.rememberMe")}
            </label>
            <a href="#" className="text-sm text-[#c0c0c0] hover:text-white transition">
              {t("auth.login.forgotPassword")}
            </a>
          </div>

          {/* Submit */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={form.isSubmitting}
            className="w-full btn-black-glow h-12 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {form.isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                {t("auth.login.signingIn")}
              </>
            ) : (
              <>
                {t("auth.login.signIn")} <ArrowRight size={18} />
              </>
            )}
          </Button>
          </motion.div>
        </motion.form>

        {/* Divider */}
        <motion.div className="relative my-8" variants={itemVariants}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(255,255,255,0.06)]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-gray-500">
              {t("auth.login.orContinueWith")}
            </span>
          </div>
        </motion.div>

        {/* Social Login */}
        <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              disabled={form.isSubmitting}
              className="w-full border-2 border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] disabled:opacity-50 transition-all"
            >
              GitHub
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              disabled={form.isSubmitting}
              className="w-full border-2 border-[rgba(255,255,255,0.12)] text-white hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] disabled:opacity-50 transition-all"
            >
              Google
            </Button>
          </motion.div>
        </motion.div>

        {/* Sign Up Link */}
        <motion.p className="text-center text-gray-400 mt-8" variants={itemVariants}>
          {t("auth.login.noAccount")}{" "}
          <a href="/signup" className="text-[#c0c0c0] hover:text-white transition font-semibold">
            {t("auth.login.signUp")}
          </a>
        </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
