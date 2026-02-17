import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Lock, User, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animations";
import { useLocation } from "wouter";
import { useForm } from "@/hooks/useForm";
import { validateSignupForm, getFieldError, hasFieldError } from "@/lib/validation";
import { useState } from "react";
import { showSuccessToast, showFormSubmitErrorToast } from "@/lib/toast";
import { ApiError, apiRequest } from "@/lib/api";

/**
 * ALEXZA AI Signup Page
 * Design: Monochrome metallic theme
 * - Form validation with inline errors
 * - Password strength indicator
 * - Loading states on submit
 */

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  company?: string;
}

export default function Signup() {
  const [, setLocation] = useLocation();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<SignupFormData>({
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
      company: "",
    },
    validate: validateSignupForm,
    onSubmit: async (values) => {
      try {
        const fallbackName = values.email.split("@")[0] || "user";
        const nameFromForm = values.company?.trim();
        const signupName =
          nameFromForm && nameFromForm.length >= 2
            ? nameFromForm
            : fallbackName.length >= 2
              ? fallbackName
              : "User";

        await apiRequest<{ ok: true; user: { id: string; email: string; name: string } }>(
          "/api/auth/signup",
          {
            method: "POST",
            body: {
              email: values.email,
              password: values.password,
              name: signupName,
            },
          }
        );
        showSuccessToast("Account created!", "Welcome to ALEXZA AI");
        setSubmitSuccess(true);
        setTimeout(() => {
          setLocation("/app/dashboard");
        }, 500);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.code === "EMAIL_EXISTS" || error.status === 409) {
            showFormSubmitErrorToast("This email is already registered");
            return;
          }
          showFormSubmitErrorToast(error.message);
          return;
        }
        showFormSubmitErrorToast("Failed to create account");
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground flex items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div className="text-center mb-12" variants={itemVariants}>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-bold text-lg">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ALEXZA AI</h1>
          <p className="text-gray-400 mt-2">Create your account</p>
        </motion.div>

        {/* Success Message */}
        {submitSuccess && (
          <motion.div
            className="mb-6 p-4 rounded-lg bg-[#c0c0c0]/10 border border-[#c0c0c0]/30 flex items-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle size={20} className="text-[#c0c0c0]" />
            <p className="text-sm text-[#c0c0c0]">Account created! Redirecting...</p>
          </motion.div>
        )}

        {/* Form */}
        <motion.form onSubmit={form.handleSubmit} className="space-y-4" variants={itemVariants}>
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="email"
                name="email"
                value={form.values.email}
                onChange={form.handleChange}
                placeholder="you@example.com"
                disabled={form.isSubmitting}
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border transition text-white placeholder-gray-600 focus:outline-none ${
                  hasFieldError(form.errors, "email")
                    ? "border-red-500/50 focus:border-red-500/70"
                    : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
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

          {/* Company */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Company (Optional)</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                name="company"
                value={form.values.company}
                onChange={form.handleChange}
                placeholder="Your company"
                disabled={form.isSubmitting}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="password"
                name="password"
                value={form.values.password}
                onChange={form.handleChange}
                placeholder="••••••••"
                disabled={form.isSubmitting}
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border transition text-white placeholder-gray-600 focus:outline-none ${
                  hasFieldError(form.errors, "password")
                    ? "border-red-500/50 focus:border-red-500/70"
                    : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
                } disabled:opacity-50`}
              />
            </div>
            {hasFieldError(form.errors, "password") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "password")}</p>
              </div>
            )}
            {form.values.password && !hasFieldError(form.errors, "password") && (
              <p className="text-xs text-[#c0c0c0] mt-1">✓ Password is strong</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Confirm Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="password"
                name="confirmPassword"
                value={form.values.confirmPassword}
                onChange={form.handleChange}
                placeholder="••••••••"
                disabled={form.isSubmitting}
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-[#0b0e12] border transition text-white placeholder-gray-600 focus:outline-none ${
                  hasFieldError(form.errors, "confirmPassword")
                    ? "border-red-500/50 focus:border-red-500/70"
                    : "border-[rgba(255,255,255,0.06)] focus:border-[rgba(255,255,255,0.12)]"
                } disabled:opacity-50`}
              />
            </div>
            {hasFieldError(form.errors, "confirmPassword") && (
              <div className="flex items-center gap-2 mt-1">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs text-red-500">{getFieldError(form.errors, "confirmPassword")}</p>
              </div>
            )}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 text-sm text-gray-400">
            <input type="checkbox" className="rounded mt-1" disabled={form.isSubmitting} />
            <span>
              I agree to the{" "}
              <a href="#" className="text-[#c0c0c0] hover:text-white transition">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#c0c0c0] hover:text-white transition">
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Submit */}
          <Button
            type="submit"
            disabled={form.isSubmitting}
            className="w-full bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black h-12 font-semibold flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {form.isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create Account <ArrowRight size={18} />
              </>
            )}
          </Button>
        </motion.form>

        {/* Divider */}
        <motion.div className="relative my-8" variants={itemVariants}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(255,255,255,0.06)]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-gray-500">
              Or sign up with
            </span>
          </div>
        </motion.div>

        {/* Social Signup */}
        <motion.div className="grid grid-cols-2 gap-4" variants={itemVariants}>
          <Button
            variant="outline"
            disabled={form.isSubmitting}
            className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
          >
            GitHub
          </Button>
          <Button
            variant="outline"
            disabled={form.isSubmitting}
            className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50"
          >
            Google
          </Button>
        </motion.div>

        {/* Login Link */}
        <motion.p className="text-center text-gray-400 mt-8" variants={itemVariants}>
          Already have an account?{" "}
          <a href="/login" className="text-[#c0c0c0] hover:text-white transition font-semibold">
            Sign in
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
