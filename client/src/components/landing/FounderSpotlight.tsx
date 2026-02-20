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
          {/* Horizontal layout: photo left, text right */}
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch gap-0">
            {/* Photo frame - polished chrome metal */}
            <div className="relative flex-shrink-0 p-8 lg:p-12">
              <div
                className="relative w-56 h-56 lg:w-64 lg:h-64 rounded-full overflow-hidden"
                style={{
                  border: '3px solid rgba(220,220,220,0.4)',
                  boxShadow: `
                    inset 0 2px 20px rgba(255,255,255,0.15),
                    inset 0 -2px 15px rgba(0,0,0,0.3),
                    0 0 30px rgba(255,255,255,0.12),
                    0 0 60px rgba(255,255,255,0.06)
                  `,
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
            </div>

            {/* Text content */}
            <div className="flex-1 p-8 lg:p-12 lg:pl-0 flex flex-col justify-center">
              <div className="space-y-4">
                {/* Name - metallic silver gradient (chiseled steel) */}
                <h3 className="text-3xl lg:text-4xl font-bold tracking-wider founder-name-gradient">
                  Phatrachat Chaikitthanakul
                </h3>

                {/* Title */}
                <p className="font-brand text-lg text-[#b0b0b0] font-medium tracking-wide">
                  CEO & Founder, ALEXZA AI
                </p>

                {/* Quote */}
                <blockquote className="font-brand text-base lg:text-lg text-gray-400 leading-relaxed pt-2">
                  &ldquo;Our mission is to forge the infrastructure of the future, empowering enterprises with
                  orchestrated, intelligent AI systems that redefine possibility. We build the metallic backbone of
                  tomorrow&apos;s intelligence.&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
