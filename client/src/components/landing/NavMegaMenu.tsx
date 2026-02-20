'use client';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Box, BookOpen, Cpu, FileText } from "lucide-react";
import { Link } from "wouter";

export default function NavMegaMenu() {
  return (
    <NavigationMenu className="max-w-none nav-mega-menu">
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-gray-300 hover:text-white hover:bg-transparent border-0 h-auto py-1 px-0 text-sm font-normal data-[state=open]:text-white">
            Product
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[420px] p-4">
              <div className="grid gap-4">
                <Link href="/docs" className="group/item block rounded-lg p-3 hover:bg-[rgba(255,255,255,0.04)] transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1d22] border border-[rgba(139,92,246,0.35)] flex items-center justify-center group-hover/item:border-[rgba(139,92,246,0.5)] group-hover/item:shadow-[0_0_16px_rgba(139,92,246,0.2)] transition-all">
                      <Cpu className="w-5 h-5 text-[#8b5cf6]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Orchestration</p>
                      <p className="text-sm text-gray-400">Build AI workflows</p>
                    </div>
                  </div>
                </Link>
                <Link href="/docs" className="group/item block rounded-lg p-3 hover:bg-[rgba(255,255,255,0.04)] transition">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1d22] border border-[rgba(212,168,75,0.35)] flex items-center justify-center group-hover/item:border-[rgba(212,168,75,0.5)] group-hover/item:shadow-[0_0_16px_rgba(212,168,75,0.2)] transition-all">
                      <Box className="w-5 h-5 text-[#d4a84b]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">API</p>
                      <p className="text-sm text-gray-400">REST API & SDKs</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent text-gray-300 hover:text-white hover:bg-transparent border-0 h-auto py-1 px-0 text-sm font-normal data-[state=open]:text-white">
            Company
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-[480px] p-4">
              <div className="grid grid-cols-[1fr_1fr] gap-6">
                <div className="space-y-1">
                  <a href="/about" className="block py-2 text-sm text-gray-300 hover:text-[#8b5cf6] transition">About</a>
                  <a href="/blog" className="block py-2 text-sm text-gray-300 hover:text-[#d4a84b] transition">Blog</a>
                  <a href="/careers" className="block py-2 text-sm text-gray-300 hover:text-[#22c55e] transition">Careers</a>
                  <a href="/customers" className="block py-2 text-sm text-gray-300 hover:text-[#06b6d4] transition">Customers</a>
                  <a href="/contact" className="block py-2 text-sm text-gray-300 hover:text-white transition">Contact</a>
                </div>
                <div className="space-y-3">
                  <Link href="/docs" className="group/item block rounded-xl p-4 border border-[rgba(139,92,246,0.25)] bg-[#0b0e12] hover:border-[rgba(139,92,246,0.45)] hover:bg-[#0b0e12]/90 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1d22] border border-[rgba(139,92,246,0.35)] flex items-center justify-center group-hover/item:border-[rgba(139,92,246,0.5)] group-hover/item:shadow-[0_0_16px_rgba(139,92,246,0.2)] transition-all">
                        <BookOpen className="w-5 h-5 text-[#8b5cf6]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Handbook</p>
                        <p className="text-xs text-gray-400">How we work</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/philosophy" className="group/item block rounded-xl p-4 border border-[rgba(212,168,75,0.25)] bg-[#0b0e12] hover:border-[rgba(212,168,75,0.45)] hover:bg-[#0b0e12]/90 hover:shadow-[0_0_20px_rgba(212,168,75,0.15)] transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1d22] border border-[rgba(212,168,75,0.35)] flex items-center justify-center group-hover/item:border-[rgba(212,168,75,0.5)] group-hover/item:shadow-[0_0_16px_rgba(212,168,75,0.2)] transition-all">
                        <FileText className="w-5 h-5 text-[#d4a84b]" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Philosophy</p>
                        <p className="text-xs text-gray-400">What we value</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link href="/docs">
            <NavigationMenuLink className={navigationMenuTriggerStyle() + " bg-transparent text-gray-300 hover:text-white hover:bg-transparent border-0 h-auto py-1 px-3 text-sm font-normal"}>
              Docs
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <Link href="/pricing">
            <NavigationMenuLink className={navigationMenuTriggerStyle() + " bg-transparent text-gray-300 hover:text-white hover:bg-transparent border-0 h-auto py-1 px-3 text-sm font-normal"}>
              Pricing
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
