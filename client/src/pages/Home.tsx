import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Cpu, TrendingUp, MessageSquare, FileText, Eye, BarChart3, Shield, Sparkles, Menu, X, Bell, Settings, Plus, MoreHorizontal, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { containerVariants, itemVariants, scrollFadeInVariants, scrollScaleInVariants, scrollSlideInLeftVariants, scrollSlideInRightVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import MorphingBlob from "@/components/blob";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";


export default function Home() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, 150]);

  return (
    <div className="min-h-screen text-foreground overflow-hidden" ref={containerRef}>
      {/* Navigation - Resend-style sharp border */}
      <nav className="fixed top-0 w-full z-50 bg-[#050607]/95 backdrop-blur-md border-b-2 border-[rgba(255,255,255,0.15)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Logo size="navbar" />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">{t('navigation.product')}</a>
            <a href="/docs" className="text-sm text-gray-300 hover:text-white transition">{t('navigation.docs')}</a>
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">{t('navigation.pricing')}</a>
            <a href="/" className="text-sm text-gray-300 hover:text-white transition">{t('navigation.company')}</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="outline" className="border-2 border-[rgba(255,255,255,0.25)] text-white hover:bg-[#0b0e12] rounded-lg" onClick={() => window.location.href = "/login"}>{t('navigation.signIn')}</Button>
            <Button className="btn-metallic rounded-lg" onClick={() => window.location.href = "/signup"}>{t('navigation.getStarted')}</Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0b0e12] border-t-2 border-[rgba(255,255,255,0.15)] p-4 space-y-4">
            <a href="#" className="block text-sm text-gray-300 hover:text-white">Product</a>
            <a href="#" className="block text-sm text-gray-300 hover:text-white">Docs</a>
            <a href="#" className="block text-sm text-gray-300 hover:text-white">Pricing</a>
            <a href="#" className="block text-sm text-gray-300 hover:text-white">Company</a>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1 border-[rgba(255,255,255,0.06)] text-white">Sign In</Button>
              <Button className="flex-1 btn-metallic">Get Started</Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Parallax background glow effect */}
        <motion.div 
          className="absolute inset-0 -z-10"
          style={{ y: parallaxY }}
        >
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c0c0c0] rounded-full blur-3xl opacity-10"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          ></motion.div>
        </motion.div>

        <motion.div 
          className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Left: Interactive Morphing Liquid Blob */}
          <motion.div 
            className="flex justify-center md:justify-end"
            variants={itemVariants}
          >
            <MorphingBlob
              size={480}
              intensity={0.7}
              colorAccent="#c0c0c0"
              idleSpeed={0.4}
              hoverStrength={0.8}
              glowStrength={1.2}
            />
          </motion.div>

          {/* Right: Hero Text */}
          <motion.div 
            className="space-y-8"
            variants={itemVariants}
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
                ALEXZA AI — Solution Orchestration Platform
              </h1>
              <p className="text-xl text-gray-300">
                Build, Orchestrate, and Optimize AI Systems Automatically
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-metallic h-12 px-8 text-base font-semibold w-full sm:w-auto rounded-lg">
                  Get Started
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="bg-transparent border-2 border-white/30 text-white hover:bg-white/5 h-12 px-8 text-base font-semibold flex items-center gap-2 w-full sm:w-auto justify-center rounded-lg">
                  View Docs <ArrowRight size={18} />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Multi-Screen Showcase */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        {/* Parallax background */}
        <motion.div 
          className="absolute inset-0 -z-10"
          style={{ y: useTransform(scrollY, [400, 900], [0, 100]) }}
        >
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#a8a8a8] rounded-full blur-3xl opacity-5"></div>
        </motion.div>

        <div className="max-w-7xl mx-auto">
          {/* Resend-style section header */}
          <motion.div 
            className="text-center mb-16"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Powerful Platform, Intuitive Interface
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              A modern platform that makes it easy to build, orchestrate, and optimize AI systems. 
              Everything you need — one that <em className="text-gray-300">just works</em>.
            </p>
          </motion.div>

          {/* Showcase Grid */}
          <motion.div 
            className="grid lg:grid-cols-2 gap-8"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* Dashboard Preview - Resend-style sharp box */}
            <motion.div 
              className="p-6 rounded-xl bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.18)] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-colors"
              variants={scrollSlideInLeftVariants}
              whileHover={{ scale: 1.01 }}
            >
              <div className="bg-[#050607] rounded-lg overflow-hidden border-2 border-[rgba(255,255,255,0.12)]">
                {/* Dashboard Header */}
                <div className="bg-[#0b0e12] border-b-2 border-[rgba(255,255,255,0.12)] px-6 py-4 flex justify-between items-center">
                  <h3 className="text-white font-semibold">Dashboard</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-white font-semibold">Welcome header</h4>
                    <span className="text-xs text-gray-400">Mode: Production</span>
                  </div>
                  <p className="text-sm text-gray-400">Here you can track your AI systems and manage your workflows</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 rounded-lg bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.12)]">
                      <p className="text-xs text-gray-400 mb-2">Credits Remaining</p>
                      <p className="text-2xl font-bold text-white">270,750</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.12)]">
                      <p className="text-xs text-gray-400 mb-2">Quick actions</p>
                      <p className="text-xs text-blue-400">+ Add Credits</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-gray-400">Recent Projects list</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">
                        <span className="text-gray-300">Deployment</span>
                        <span className="px-2 py-0.5 rounded text-green-400 border border-green-500/50 bg-green-500/10">Running</span>
                      </div>
                      <div className="flex justify-between items-center text-xs py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">
                        <span className="text-gray-300">Analytics</span>
                        <span className="px-2 py-0.5 rounded text-yellow-400 border border-yellow-500/50 bg-yellow-500/10">Paused</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Chat Builder Preview */}
            <motion.div 
              className="p-6 rounded-xl bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.18)] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-colors"
              variants={scrollSlideInRightVariants}
              whileHover={{ scale: 1.01 }}
            >
              <div className="bg-[#050607] rounded-lg overflow-hidden border-2 border-[rgba(255,255,255,0.12)]">
                {/* Chat Header */}
                <div className="bg-[#0b0e12] border-b-2 border-[rgba(255,255,255,0.12)] px-6 py-4 flex justify-between items-center">
                  <h3 className="text-white font-semibold">Chat Builder</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                
                {/* Chat Content */}
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="max-w-xs px-4 py-2 rounded-lg bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.12)] text-xs text-gray-300">
                        Hello! I'm your AI assistant
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-xs px-4 py-2 rounded-lg bg-[#1a1d22] border-2 border-[#c0c0c0]/50 text-xs text-white">
                        I want to create a chatbot
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-gray-400">Generated API Spec</p>
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-[#0b0e12] border-2 border-[#c0c0c0]/50 text-xs">
                        <span className="text-[#c0c0c0] font-semibold">POST</span>
                        <span className="text-gray-300 ml-2">/api/chat</span>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.15)] text-xs">
                        <span className="text-[#a8a8a8] font-semibold">GET</span>
                        <span className="text-gray-300 ml-2">/api/history</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Credits Preview */}
            <motion.div 
              className="p-6 rounded-xl bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.18)] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-colors"
              variants={scrollScaleInVariants}
              whileHover={{ scale: 1.01 }}
            >
              <div className="bg-[#050607] rounded-lg overflow-hidden border-2 border-[rgba(255,255,255,0.12)]">
                {/* Credits Header */}
                <div className="bg-[#0b0e12] border-b-2 border-[rgba(255,255,255,0.12)] px-6 py-4 flex justify-between items-center">
                  <h3 className="text-white font-semibold">Credits usage</h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                
                {/* Credits Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Credits Remaining</p>
                    <p className="text-4xl font-bold text-white">170,000</p>
                  </div>

                  <div className="mt-6 space-y-2">
                    <p className="text-xs text-gray-400">Free Trial Ending</p>
                    <div className="p-3 rounded-lg bg-[#1a1d22] border-2 border-white/20">
                      <p className="text-xs text-white">Your free trial ends in 7 days</p>
                      <button className="mt-2 text-xs px-3 py-1.5 rounded-lg border-2 border-[#c0c0c0] bg-[#c0c0c0]/20 text-[#c0c0c0] hover:bg-[#c0c0c0]/30 transition">
                        Upgrade Now
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-gray-400 mb-2">Credits Transactions Table</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)] text-gray-300">
                        <span>Feb 10, 2026</span>
                        <span className="text-red-400">-15,234</span>
                      </div>
                      <div className="flex justify-between items-center py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)] text-gray-300">
                        <span>Feb 09, 2026</span>
                        <span className="text-red-400">-12,456</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Features Overview */}
            <motion.div 
              className="p-6 rounded-xl bg-[#0b0e12] border-2 border-[rgba(255,255,255,0.18)] overflow-hidden hover:border-[rgba(255,255,255,0.25)] transition-colors"
              variants={scrollFadeInVariants}
              whileHover={{ scale: 1.01 }}
            >
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">How It Works</h3>
                
                <div className="space-y-4">
                  <motion.div 
                    className="flex items-start gap-4 p-3 rounded-lg border-2 border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors"
                    variants={staggerItemVariants}
                  >
                    <div className="w-10 h-10 rounded-lg border-2 border-[#c0c0c0]/50 bg-[#c0c0c0]/10 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-[#c0c0c0]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">Design Your Flow</h4>
                      <p className="text-xs text-gray-400 mt-1">Create AI pipelines with our intuitive visual editor.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-start gap-4 p-3 rounded-lg border-2 border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors"
                    variants={staggerItemVariants}
                  >
                    <div className="w-10 h-10 rounded-lg border-2 border-[rgba(255,255,255,0.2)] bg-[#1a1d22] flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-gray-300" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">Deploy Instantly</h4>
                      <p className="text-xs text-gray-400 mt-1">Launch your infrastructure with one click.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex items-start gap-4 p-3 rounded-lg border-2 border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-colors"
                    variants={staggerItemVariants}
                  >
                    <div className="w-10 h-10 rounded-lg border-2 border-[#c0c0c0]/50 bg-[#c0c0c0]/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-[#c0c0c0]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-sm">Monitor & Scale</h4>
                      <p className="text-xs text-gray-400 mt-1">Track performance and automatically scale resources.</p>
                    </div>
                  </motion.div>
                </div>

                <div className="pt-4 border-t-2 border-[rgba(255,255,255,0.12)]">
                  <p className="text-xs text-gray-400 mb-3">Use Cases</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-xs text-gray-300 py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">✓ Intelligent Chatbots</div>
                    <div className="text-xs text-gray-300 py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">✓ Document Processing</div>
                    <div className="text-xs text-gray-300 py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">✓ Computer Vision</div>
                    <div className="text-xs text-gray-300 py-2 px-3 rounded-md border border-[rgba(255,255,255,0.08)]">✓ Predictive Analytics</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section - Resend-style box */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="max-w-4xl mx-auto text-center p-12 rounded-xl border-2 border-[rgba(255,255,255,0.18)] bg-[#0b0e12]"
          variants={scrollFadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Build?</h2>
          <p className="text-xl text-gray-300 mb-8">Start orchestrating your AI systems today with ALEXZA AI</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-metallic h-12 px-8 text-base font-semibold rounded-lg">
                Get Started Free
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" className="border-2 border-white/30 text-white hover:bg-white/5 h-12 px-8 text-base font-semibold rounded-lg">
                View Documentation
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer - Resend-style sharp border */}
      <motion.footer 
        className="border-t-2 border-[rgba(255,255,255,0.15)] py-12 px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Terms</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">Twitter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t-2 border-[rgba(255,255,255,0.12)] pt-8 flex justify-between items-center text-sm text-gray-400">
            <p>© 2026 ALEXZA AI. All rights reserved.</p>
            <p>All systems operational</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
