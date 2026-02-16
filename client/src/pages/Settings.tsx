import { Button } from "@/components/ui/button";
import { Save, LogOut, Bell, Lock, User, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { containerVariants, itemVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";

/**
 * ALEXZA AI Settings Page
 * User preferences and account settings
 */

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "John Doe",
    email: "john@example.com",
    company: "Acme Corp",
    role: "Product Manager",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-gray-400 mt-2">Manage your account and preferences</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-8">
        <motion.div
          className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Sidebar */}
          <motion.div className="lg:col-span-1" variants={itemVariants}>
            <nav className="space-y-2">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "security", label: "Security", icon: Lock },
                { id: "notifications", label: "Notifications", icon: Bell },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      activeTab === item.id
                        ? "bg-[#c0c0c0]/10 text-white border border-[#c0c0c0]/20"
                        : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </motion.div>

          {/* Main Content */}
          <motion.div className="lg:col-span-3" variants={itemVariants}>
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <motion.div
                className="space-y-8"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
                  variants={staggerItemVariants}
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>

                  <form className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#c0c0c0] to-[#a8a8a8] flex items-center justify-center text-black font-bold text-2xl">
                        JD
                      </div>
                      <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]">
                        Change Avatar
                      </Button>
                    </div>

                    {/* Form Fields */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Company</label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Role</label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                        >
                          <option>Product Manager</option>
                          <option>Engineer</option>
                          <option>Designer</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>

                    <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold flex items-center gap-2">
                      <Save size={18} /> Save Changes
                    </Button>
                  </form>
                </motion.div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <motion.div
                className="space-y-8"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
                  variants={staggerItemVariants}
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>

                  <form className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)] text-white placeholder-gray-600 focus:border-[rgba(255,255,255,0.12)] focus:outline-none transition"
                      />
                    </div>

                    <Button className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
                      Update Password
                    </Button>
                  </form>
                </motion.div>

                <motion.div
                  className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
                  variants={staggerItemVariants}
                >
                  <h2 className="text-2xl font-bold text-white mb-4">Two-Factor Authentication</h2>
                  <p className="text-gray-400 mb-6">Add an extra layer of security to your account</p>
                  <Button variant="outline" className="border-[rgba(255,255,255,0.06)] text-white hover:bg-[rgba(255,255,255,0.06)]">
                    Enable 2FA
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <motion.div
                className="space-y-8"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div
                  className="p-8 rounded-xl bg-gradient-to-br from-[#0b0e12] to-[#050607] border border-[rgba(255,255,255,0.06)]"
                  variants={staggerItemVariants}
                >
                  <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>

                  <div className="space-y-4">
                    {[
                      { label: "Email notifications", description: "Receive updates via email" },
                      { label: "Credit alerts", description: "Get notified when credits are low" },
                      { label: "API errors", description: "Alerts for API failures" },
                      { label: "Weekly digest", description: "Summary of your usage" },
                    ].map((pref, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[#0b0e12] border border-[rgba(255,255,255,0.06)]">
                        <div>
                          <p className="font-semibold text-white">{pref.label}</p>
                          <p className="text-sm text-gray-500">{pref.description}</p>
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                      </div>
                    ))}
                  </div>

                  <Button className="mt-6 bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black font-semibold">
                    Save Preferences
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Danger Zone */}
      <div className="p-8 border-t border-[rgba(255,255,255,0.06)]">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            className="p-8 rounded-xl bg-[#a8a8a8]/5 border border-[#a8a8a8]/20"
            variants={itemVariants}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Danger Zone</h2>
            <p className="text-gray-400 mb-6">Irreversible actions</p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="border-[#a8a8a8]/20 text-white hover:bg-[#a8a8a8]/10 flex items-center gap-2"
              >
                <LogOut size={18} /> Sign Out
              </Button>
              <Button
                variant="outline"
                className="border-[#a8a8a8]/20 text-[#a8a8a8] hover:bg-[#a8a8a8]/10"
              >
                Delete Account
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
