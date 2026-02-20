'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { scrollFadeInVariants } from '@/lib/animations';

const FOUNDER_IMAGE = '/founder.png';

export default function FounderSpotlight() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dark textured background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, #050607 0%, #0a0b0d 50%, #050607 100%)',
        }}
      />

      {/* Top-down spotlight effect */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-80 -z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-5xl mx-auto">
        <motion.h2
          className="font-brand text-4xl font-bold text-white text-center mb-12"
          variants={scrollFadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          About Us
        </motion.h2>
        <motion.div
          className="relative rounded-2xl overflow-hidden"
          variants={scrollFadeInVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          style={{
            background: 'linear-gradient(135deg, #0a0a0c 0%, #080809 50%, #060607 100%)',
            border: '1px solid rgba(200, 200, 200, 0.25)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.08),
              0 0 40px rgba(255,255,255,0.08),
              0 0 80px rgba(255,255,255,0.04),
              inset 0 1px 0 rgba(255,255,255,0.06)
            `,
          }}
        >
          {/* Horizontal layout: small photo + name/title inline, quote below */}
          <div className="flex flex-col p-5 lg:p-6">
            {/* Photo + name + title - compact inline */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="relative w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0 rounded-full overflow-hidden"
                style={{
                  border: '2px solid rgba(220,220,220,0.35)',
                  boxShadow: '0 0 12px rgba(255,255,255,0.08)',
                  background: 'linear-gradient(145deg, #2a2a2e 0%, #1a1a1d 50%, #0d0d0f 100%)',
                }}
              >
                <img
                  src={FOUNDER_IMAGE}
                  alt="Phatrachat Chaikitthanakul - CEO & Founder"
                  className="w-full h-full object-cover"
                />
                {/* Rim light overlay */}
                <div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 30px rgba(255,255,255,0.08)',
                  }}
                />
              </div>
              <div>
                <h3 className="text-base lg:text-lg font-bold tracking-wider founder-name-gradient">
                  Phatrachat Chaikitthanakul
                </h3>
                <p className="font-brand text-xs text-[#b0b0b0] font-medium tracking-wide mt-0.5">
                  CEO & Founder, ALEXZA AI
                </p>
              </div>
            </div>

            {/* Quote */}
            <blockquote className="font-brand text-sm lg:text-base text-gray-400 leading-relaxed">
              &ldquo;Our mission is to forge the infrastructure of the future, empowering enterprises with
              orchestrated, intelligent AI systems that redefine possibility. We build the metallic backbone of
              tomorrow&apos;s intelligence.&rdquo;
            </blockquote>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
