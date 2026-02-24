import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Cpu, TrendingUp, MessageSquare, FileText, Eye, BarChart3, Shield, Sparkles, Menu, X, Bell, Settings, Plus, MoreHorizontal, AlertCircle, Network, GitBranch, Gauge, FlaskConical, Webhook, Send, Mail, MapPin, Github, Linkedin, Youtube } from "lucide-react";
import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { containerVariants, itemVariants, scrollFadeInVariants, scrollScaleInVariants, scrollSlideInLeftVariants, scrollSlideInRightVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations";
import MorphingBlob from "@/components/blob";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import NavMegaMenu from "@/components/landing/NavMegaMenu";
import FounderSpotlight from "@/components/landing/FounderSpotlight";


type CodeTab = 'node' | 'python' | 'curl';

export default function Home() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<CodeTab>('node');
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

          {/* Desktop Menu - Mega menu style */}
          <div className="hidden md:flex items-center">
            <NavMegaMenu />
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Button variant="outline" className="border-2 border-[rgba(255,255,255,0.25)] text-white hover:bg-[#0b0e12] rounded-lg" onClick={() => window.location.href = "/login"}>{t('navigation.signIn')}</Button>
            <Button className="btn-silver-bright rounded-lg" onClick={() => window.location.href = "/signup"}>{t('navigation.getStarted')}</Button>
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
            <a href="/pricing" className="block text-sm text-gray-300 hover:text-white">Pricing</a>
            <a href="#" className="block text-sm text-gray-300 hover:text-white">Company</a>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1 border-[rgba(255,255,255,0.06)] text-white">Sign In</Button>
              <Button className="flex-1 btn-silver-bright">Get Started</Button>
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
              size={280}
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
          </motion.div>

          {/* Right: Hero Text */}
          <motion.div 
            className="space-y-8"
            variants={itemVariants}
          >
            <div className="space-y-4">
              <h1 className="hero-title-gradient font-brand text-5xl md:text-6xl font-extrabold md:font-black leading-tight tracking-tight">
                ALEXZA AI — Solution Orchestration Platform
              </h1>
              <p className="text-xl text-gray-300">
                Build, Orchestrate, and Optimize AI Systems Automatically
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="btn-black-glow h-12 px-8 text-base font-semibold w-full sm:w-auto rounded-lg">
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

      {/* Key Features - Why Orchestrate with ALEXZA AI? */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-4xl font-bold text-white text-center mb-12"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Why Orchestrate with ALEXZA AI?
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {[
              { icon: Network, title: "ALEXZA Managed Runtime", desc: "Unified AI runtime with intelligent routing. Build once, run anywhere.", color: "mono" as const },
              { icon: GitBranch, title: "Visual Flow Builder", desc: "Design complex AI agent workflows with our intuitive drag-and-drop interface.", color: "mono" as const },
              { icon: Gauge, title: "Real-time Optimization", desc: "Monitor performance, track costs, and optimize latency automatically.", color: "mono" as const },
            ].map((item, i) => {
              const Icon = item.icon;
              const colorMap = {
                mono: {
                  border: "hover:border-[rgba(255,255,255,0.4)]",
                  shadow: "hover:shadow-[0_0_30px_rgba(255,255,255,0.1),0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]",
                  iconBorder: "border-[rgba(255,255,255,0.25)]",
                  iconBg: "bg-[#1a1d22]",
                  iconBgHover: "group-hover:bg-[#252830] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]",
                  iconGlow: "",
                  iconColor: "text-[#c0c0c0]",
                },
                purple: {
                  border: "hover:border-[rgba(109,40,217,0.55)]",
                  shadow: "hover:shadow-[0_0_30px_rgba(109,40,217,0.25)]",
                  iconBorder: "border-[rgba(109,40,217,0.45)]",
                  iconBg: "bg-[rgba(109,40,217,0.12)]",
                  iconBgHover: "group-hover:bg-[rgba(109,40,217,0.2)]",
                  iconGlow: "group-hover:shadow-[0_0_20px_rgba(109,40,217,0.3)]",
                  iconColor: "text-[#7c3aed]",
                },
                gold: {
                  border: "hover:border-[rgba(180,134,11,0.55)]",
                  shadow: "hover:shadow-[0_0_30px_rgba(180,134,11,0.25)]",
                  iconBorder: "border-[rgba(180,134,11,0.45)]",
                  iconBg: "bg-[rgba(180,134,11,0.12)]",
                  iconBgHover: "group-hover:bg-[rgba(180,134,11,0.2)]",
                  iconGlow: "group-hover:shadow-[0_0_20px_rgba(180,134,11,0.3)]",
                  iconColor: "text-[#b8860b]",
                },
                green: {
                  border: "hover:border-[rgba(22,163,74,0.55)]",
                  shadow: "hover:shadow-[0_0_30px_rgba(22,163,74,0.25)]",
                  iconBorder: "border-[rgba(22,163,74,0.45)]",
                  iconBg: "bg-[rgba(22,163,74,0.12)]",
                  iconBgHover: "group-hover:bg-[rgba(22,163,74,0.2)]",
                  iconGlow: "group-hover:shadow-[0_0_20px_rgba(22,163,74,0.3)]",
                  iconColor: "text-[#16a34a]",
                },
              };
              const c = colorMap[item.color];
              return (
                <motion.div
                  key={i}
                  className={`group p-6 rounded-xl bg-[#07090b] border border-[rgba(255,255,255,0.1)] transition-all duration-300 ${c.border} ${c.shadow} shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]`}
                  variants={scrollFadeInVariants}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 border ${c.iconBorder} ${c.iconBg} ${c.iconBgHover} ${c.iconGlow} transition-all`}>
                    <Icon className={`w-6 h-6 ${c.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
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
            {/* Card 1 - Test Mode (Resend-style) */}
            <motion.div 
              className="showcase-card flex flex-col rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] overflow-hidden hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
              variants={scrollSlideInLeftVariants}
              whileHover={{ scale: 1.01 }}
            >
              {/* Top: Input + HTTP logs */}
              <div className="flex-1 p-5 space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.08)]">
                  <span className="px-2 py-0.5 rounded text-xs font-medium text-green-400 border border-green-500/50 bg-green-500/10">Delivered</span>
                  <span className="text-sm text-gray-300 flex-1 truncate">run@alexza.ai</span>
                  <button className="p-1.5 rounded-md border border-[rgba(255,255,255,0.15)] hover:bg-white/5 transition">
                    <Send className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-1 font-mono text-xs text-gray-400">
                  <div><span className="text-cyan-400">HTTP 200</span>: {'{ "id": "'}<span className="text-amber-400">26abdd24...</span>{'" }'}</div>
                  <div><span className="text-cyan-400">HTTP 200</span>: {'{ "id": "'}<span className="text-amber-400">cc3817db...</span>{'" }'}</div>
                  <div><span className="text-cyan-400">HTTP 200</span>: {'{ "id": "'}<span className="text-amber-400">4ea2f827...</span>{'" }'}</div>
                  <div><span className="text-cyan-400">HTTP 200</span>: {'{ "id": "'}<span className="text-amber-400">8f3c1a2b...</span>{'" }'}</div>
                </div>
              </div>
              {/* Bottom: Icon + Title + Desc + Learn more */}
              <div className="p-5 pt-0 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
                <FlaskConical className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Test Mode</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Simulate events and experiment with our API without the risk of accidentally sending real requests to production.
                </p>
                <a href="/docs" className="inline-block text-sm text-gray-400 hover:text-white transition">Learn more</a>
              </div>
            </motion.div>

            {/* Card 2 - Modular Webhooks (Resend-style) */}
            <motion.div 
              className="showcase-card flex flex-col rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] overflow-hidden hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
              variants={scrollSlideInRightVariants}
              whileHover={{ scale: 1.01 }}
            >
              {/* Top: Notification rows */}
              <div className="flex-1 p-5 space-y-3">
                <div className="p-3 rounded-lg border border-[rgba(255,255,255,0.08)] space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="px-2 py-0.5 rounded text-xs text-sky-400 border border-sky-500/40 bg-sky-500/10">Opened</span>
                    <span className="text-xs text-gray-500">Feb 21 12:06:50</span>
                  </div>
                  <p className="text-xs text-gray-300">from user@example.com with subject <span className="text-gray-400">Flow Completed</span></p>
                  <p className="text-xs text-gray-500">on agent <span className="px-1.5 py-0.5 rounded text-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]">Chrome</span> <span className="px-1.5 py-0.5 rounded text-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]">macOS</span></p>
                </div>
                <div className="p-3 rounded-lg border border-[rgba(255,255,255,0.08)] space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="px-2 py-0.5 rounded text-xs text-sky-400 border border-sky-500/40 bg-sky-500/10">Delivered</span>
                    <span className="text-xs text-gray-500">Feb 21 12:06:47</span>
                  </div>
                  <p className="text-xs text-gray-300">from api@alexza.ai with subject <span className="text-gray-400">Run Success</span></p>
                  <p className="text-xs text-gray-500">on agent <span className="px-1.5 py-0.5 rounded text-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]">API</span> <span className="px-1.5 py-0.5 rounded text-[10px] border border-[rgba(255,255,255,0.1)] bg-[#0b0e12]">Windows</span></p>
                </div>
              </div>
              {/* Bottom: Icon + Title + Desc + Learn more */}
              <div className="p-5 pt-0 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
                <Webhook className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Modular Webhooks</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Receive real-time notifications directly to your server. Every time a flow runs, completes, or fails.
                </p>
                <a href="/docs" className="inline-block text-sm text-gray-400 hover:text-white transition">Learn more</a>
              </div>
            </motion.div>

            {/* Card 3 - Credits Usage (Resend-style) */}
            <motion.div 
              className="showcase-card flex flex-col rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] overflow-hidden hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
              variants={scrollScaleInVariants}
              whileHover={{ scale: 1.01 }}
            >
              {/* Top: Usage stats + transactions */}
              <div className="flex-1 p-5 space-y-3">
                <div className="p-4 rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.08)]">
                  <p className="text-xs text-gray-500 mb-1">Credits Remaining</p>
                  <p className="text-2xl font-bold text-white">170,000</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-300">
                    <span>Feb 10, 2026</span>
                    <span className="text-red-400">-15,234</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-300">
                    <span>Feb 09, 2026</span>
                    <span className="text-red-400">-12,456</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg border border-[rgba(255,255,255,0.08)] text-gray-300">
                    <span>Feb 08, 2026</span>
                    <span className="text-green-400">+50,000</span>
                  </div>
                </div>
              </div>
              {/* Bottom: Icon + Title + Desc + Learn more */}
              <div className="p-5 pt-0 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
                <BarChart3 className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Credits & Usage</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Track your API usage and credits in real time. Upgrade anytime to scale your AI workloads.
                </p>
                <a href="/docs" className="inline-block text-sm text-gray-400 hover:text-white transition">Learn more</a>
              </div>
            </motion.div>

            {/* Card 4 - How It Works (Resend-style) */}
            <motion.div 
              className="showcase-card flex flex-col rounded-xl bg-[#0b0e12] border border-[rgba(255,255,255,0.12)] overflow-hidden hover:border-[rgba(255,255,255,0.18)] transition-all duration-300"
              variants={scrollFadeInVariants}
              whileHover={{ scale: 1.01 }}
            >
              {/* Top: Feature steps */}
              <div className="flex-1 p-5 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.08)]">
                  <MessageSquare className="w-5 h-5 text-[#c0c0c0] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Design Your Flow</p>
                    <p className="text-xs text-gray-500">Visual editor</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.08)]">
                  <Zap className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Deploy Instantly</p>
                    <p className="text-xs text-gray-500">One click</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.08)]">
                  <BarChart3 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white">Monitor & Scale</p>
                    <p className="text-xs text-gray-500">Auto-scale</p>
                  </div>
                </div>
              </div>
              {/* Bottom: Icon + Title + Desc + Learn more */}
              <div className="p-5 pt-0 space-y-3 border-t border-[rgba(255,255,255,0.06)]">
                <GitBranch className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">How It Works</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Create AI pipelines with our intuitive visual editor. Deploy with one click and scale automatically.
                </p>
                <a href="/docs" className="inline-block text-sm text-gray-400 hover:text-white transition">Learn more</a>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Integrate - Resend-style API code block + Live Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-12"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {/* 3D blob แบบ hero - แสงเขียวด้านล่าง */}
            <div className="integrate-sphere-wrap">
              <div className="integrate-sphere-panel">
                <MorphingBlob
                  size={70}
                  intensity={0.6}
                  colorAccent="#c0c0c0"
                  idleSpeed={0.5}
                  hoverStrength={0.8}
                  glowStrength={1}
                  glowColor="#22c55e"
                  chaosLevel={0.85}
                />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Integrate</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              A simple, elegant interface so you can start orchestrating AI in minutes. 
              It fits right into your code with our REST API.
            </p>
          </motion.div>

          <motion.div 
            className="code-block-border-glow"
            variants={scrollFadeInVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden relative code-block-carbon">
            <div className="grid lg:grid-cols-[1fr_380px] min-h-[420px]">
              {/* Left: Code */}
              <div className="flex flex-col border-r-0 lg:border-r border-[rgba(255,255,255,0.08)]">
            {/* Tabs - Resend style */}
            <div className="flex flex-wrap gap-1 p-3 border-b-2 border-[rgba(255,255,255,0.12)] bg-[#0a0a0a]">
              {(['node', 'python', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCodeTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    codeTab === tab
                      ? 'bg-[#1a1d22] border-2 border-[rgba(255,255,255,0.25)] text-white'
                      : 'text-gray-400 hover:text-white border-2 border-transparent'
                  }`}
                >
                  {tab === 'node' && 'Node.js'}
                  {tab === 'python' && 'Python'}
                  {tab === 'curl' && 'cURL'}
                </button>
              ))}
            </div>

            {/* Code block - โค๊ดเลื่อนขึ้นช้าๆ พื้นหลังคาร์บอนดำ */}
            <div className="flex-1 p-6 overflow-x-auto code-block-animated relative">
              <div className="code-scroll-wrap max-h-[280px]">
                <div className="code-scroll-inner">
                  <pre className="text-sm font-mono text-gray-300 leading-relaxed">
                    {codeTab === 'node' && (
                      <>
                        <code>
                          <span className="text-blue-400">const</span> response = <span className="text-blue-400">await</span> fetch(<span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span>, {'{'}{'\n'}
                          {'  '}method: <span className="text-amber-400">'POST'</span>,{'\n'}
                          {'  '}headers: {'{'}{'\n'}
                          {'    '}<span className="text-purple-400">'Content-Type'</span>: <span className="text-amber-400">'application/json'</span>,{'\n'}
                          {'    '}<span className="text-purple-400">'x-api-key'</span>: <span className="text-gray-400">'axza_xxxxxxxx'</span>,{'\n'}
                          {'  '}{'}'},{'\n'}
                          {'  '}body: <span className="text-violet-400">JSON.stringify</span>({'{'}{'\n'}
                          {'    '}input: <span className="text-green-400">'Hello, run my AI flow'</span>{'\n'}
                          {'  '}{'}'}){'\n'}
                          {'}'});{'\n\n'}
                          <span className="text-blue-400">const</span> data = <span className="text-blue-400">await</span> response.<span className="text-cyan-400">json</span>();{'\n'}
                          console.log(data.<span className="text-gray-400">output</span>)<span className="code-cursor-blink" />
                        </code>
                        <code className="block pt-8">
                          <span className="text-blue-400">const</span> response = <span className="text-blue-400">await</span> fetch(<span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span>, {'{'}{'\n'}
                          {'  '}method: <span className="text-amber-400">'POST'</span>,{'\n'}
                          {'  '}headers: {'{'}{'\n'}
                          {'    '}<span className="text-purple-400">'Content-Type'</span>: <span className="text-amber-400">'application/json'</span>,{'\n'}
                          {'    '}<span className="text-purple-400">'x-api-key'</span>: <span className="text-gray-400">'axza_xxxxxxxx'</span>,{'\n'}
                          {'  '}{'}'},{'\n'}
                          {'  '}body: <span className="text-violet-400">JSON.stringify</span>({'{'}{'\n'}
                          {'    '}input: <span className="text-green-400">'Hello, run my AI flow'</span>{'\n'}
                          {'  '}{'}'}){'\n'}
                          {'}'});{'\n\n'}
                          <span className="text-blue-400">const</span> data = <span className="text-blue-400">await</span> response.<span className="text-cyan-400">json</span>();{'\n'}
                          console.log(data.<span className="text-gray-400">output</span>)<span className="code-cursor-blink" />
                        </code>
                      </>
                    )}
                    {codeTab === 'python' && (
                      <>
                        <code>
                          <span className="text-purple-400">import</span> requests{'\n\n'}
                          response = requests.<span className="text-cyan-400">post</span>({'\n'}
                          {'    '}<span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span>,{'\n'}
                          {'    '}headers={'{'}{'\n'}
                          {'        '}<span className="text-purple-400">'Content-Type'</span>: <span className="text-amber-400">'application/json'</span>,{'\n'}
                          {'        '}<span className="text-purple-400">'x-api-key'</span>: <span className="text-gray-400">'axza_xxxxxxxx'</span>{'\n'}
                          {'    '}{'}'},{'\n'}
                          {'    '}json={'{'}<span className="text-amber-400">'input'</span>: <span className="text-green-400">'Hello, run my AI flow'</span>{'}'}{'\n'}
                          ){'\n\n'}
                          data = response.<span className="text-cyan-400">json</span>(){'\n'}
                          print(data[<span className="text-violet-400">'output'</span>])<span className="code-cursor-blink" />
                        </code>
                        <code className="block pt-8">
                          <span className="text-purple-400">import</span> requests{'\n\n'}
                          response = requests.<span className="text-cyan-400">post</span>({'\n'}
                          {'    '}<span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span>,{'\n'}
                          {'    '}headers={'{'}{'\n'}
                          {'        '}<span className="text-purple-400">'Content-Type'</span>: <span className="text-amber-400">'application/json'</span>,{'\n'}
                          {'        '}<span className="text-purple-400">'x-api-key'</span>: <span className="text-gray-400">'axza_xxxxxxxx'</span>{'\n'}
                          {'    '}{'}'},{'\n'}
                          {'    '}json={'{'}<span className="text-amber-400">'input'</span>: <span className="text-green-400">'Hello, run my AI flow'</span>{'}'}{'\n'}
                          ){'\n\n'}
                          data = response.<span className="text-cyan-400">json</span>(){'\n'}
                          print(data[<span className="text-violet-400">'output'</span>])<span className="code-cursor-blink" />
                        </code>
                      </>
                    )}
                    {codeTab === 'curl' && (
                      <>
                        <code>
                          curl -X POST <span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span> \{'\n'}
                          {'  '}-H <span className="text-purple-400">'Content-Type: application/json'</span> \{'\n'}
                          {'  '}-H <span className="text-purple-400">'x-api-key: axza_xxxxxxxx'</span> \{'\n'}
                          {'  '}-d <span className="text-amber-400">{`'{"input": "Hello, run my AI flow"}'`}</span><span className="code-cursor-blink" />
                        </code>
                        <code className="block pt-8">
                          curl -X POST <span className="text-cyan-400">'https://api.alexza.ai/v1/run'</span> \{'\n'}
                          {'  '}-H <span className="text-purple-400">'Content-Type: application/json'</span> \{'\n'}
                          {'  '}-H <span className="text-purple-400">'x-api-key: axza_xxxxxxxx'</span> \{'\n'}
                          {'  '}-d <span className="text-amber-400">{`'{"input": "Hello, run my AI flow"}'`}</span><span className="code-cursor-blink" />
                        </code>
                      </>
                    )}
                  </pre>
                </div>
              </div>

              {/* HTTP response logs - โผล่ขึ้นมาช้าๆ วนซ้ำตลอด */}
              <div className="mt-4 space-y-1 border-t border-[rgba(255,255,255,0.08)] pt-4 min-h-[72px]">
                {['26abdd24-36a9-475d-83bf-4d27a31c7def', 'cc3817db-d398-4892-8bc0-8bc589a2cfb3', '4ea2f827-c3a2-471e-b0a1-8bb0bcb5c67c'].map((id, i) => (
                  <motion.div
                    key={id}
                    className="text-xs font-mono"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      repeatDelay: 0,
                      times: [0, 0.15, 0.7, 1],
                      delay: i * 2,
                    }}
                  >
                    <span className="text-cyan-400">HTTP</span>{' '}
                    <span className="text-green-400">200</span>
                    <span className="text-gray-500">: </span>
                    <span className="text-gray-500">{'{ '}</span>
                    <span className="text-purple-400">"id"</span>
                    <span className="text-gray-500">: </span>
                    <span className="text-amber-400">"{id.slice(0, 8)}..."</span>
                    <span className="text-gray-500">{' }'}</span>
                  </motion.div>
                ))}
              </div>
            </div>
              </div>

              {/* Right: Live Preview - About us / Output (Resend-style) */}
              <div className="flex flex-col items-center justify-center p-8 code-block-carbon border-t lg:border-t-0 lg:border-l border-[rgba(255,255,255,0.06)] relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,255,255,0.03) 0%, transparent 60%)' }} />
                <div className="relative z-10 w-full max-w-[320px] text-center space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center border border-[rgba(255,255,255,0.2)]" style={{ background: 'linear-gradient(180deg, #0d0d0d 0%, #080808 40%, #050505 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(255,255,255,0.12)' }}>
                    <Cpu className="w-8 h-8 text-[#e8e8e8]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Welcome to <strong className="text-[#e8e8e8]">ALEXZA AI</strong></h3>
                    <p className="text-sm text-gray-400 leading-relaxed mt-2">
                      We're excited to help you orchestrate AI systems. Build, deploy, and scale intelligent workflows with our platform.
                    </p>
                  </div>
                  <p className="text-sm text-gray-300">
                    If you have any questions or need assistance, our team is here to help.
                  </p>
                  <a href="/signup" className="btn-black-glow inline-block px-6 py-2.5 rounded-lg text-sm font-medium">
                    Get Started
                  </a>
                  <p className="text-xs text-gray-500 pt-2">
                    Cheers,<br />The ALEXZA AI Team
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex flex-wrap gap-4 border-t border-[rgba(255,255,255,0.08)]">
              <a href="/docs" className="text-sm text-[#c0c0c0] hover:text-white transition flex items-center gap-1">
                View Documentation <ArrowRight size={14} />
              </a>
              <a href="/signup" className="text-sm text-[#c0c0c0] hover:text-white transition">
                Get API Key
              </a>
            </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us - Founder Spotlight */}
      <FounderSpotlight />

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
              <Button className="btn-gold h-12 px-8 text-base font-semibold rounded-lg">
                Get Started Free
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="btn-outline-silver h-12 px-8 text-base font-semibold rounded-lg">
                View Documentation
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Footer - Resend-style with contact info & link columns */}
      <motion.footer 
        className="border-t-2 border-[rgba(255,255,255,0.15)] py-12 px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 mb-10">
            {/* Left: Address, backing badge, social icons, status */}
            <div className="space-y-5">
              <p className="text-gray-400 text-sm leading-relaxed flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
                <span>2261 Market Street #5039, San Francisco, CA 94114</span>
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1d22] border border-[rgba(255,255,255,0.1)]">
                <span className="text-xs font-medium text-gray-400">Backed by</span>
                <span className="text-sm font-bold text-[#c0c0c0]">Y Combinator</span>
              </div>
              <div className="flex gap-2">
                {[
                  { Icon: X, href: '#', label: 'X' },
                  { Icon: Github, href: '#', label: 'GitHub' },
                  { Icon: Linkedin, href: '#', label: 'LinkedIn' },
                  { Icon: Youtube, href: '#', label: 'YouTube' },
                ].map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-9 h-9 rounded-full border border-[rgba(255,255,255,0.15)] flex items-center justify-center text-gray-400 hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-400">All systems operational</span>
              </a>
            </div>

            {/* Right: Link columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Features</h4>
                <ul className="space-y-2">
                  {['API', 'Flow Builder', 'Webhooks', 'Analytics', 'Integrations'].map((link) => (
                    <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Resources</h4>
                <ul className="space-y-2">
                  {['Changelog', 'Pricing', 'Security', 'Docs', 'Status'].map((link) => (
                    <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
                <ul className="space-y-2">
                  {['About', 'Blog', 'Careers', 'Contact'].map((link) => (
                    <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Help</h4>
                <ul className="space-y-2">
                  {['Contact', 'Support', 'Status', 'Knowledge Base'].map((link) => (
                    <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
                <ul className="space-y-2">
                  {['Privacy', 'Terms'].map((link) => (
                    <li key={link}><a href="#" className="text-gray-400 hover:text-white text-sm">{link}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t-2 border-[rgba(255,255,255,0.12)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© 2026 ALEXZA AI. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All systems operational
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
