import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import Logo from "@/components/Logo";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#050607] via-[#0b0e12] to-[#050607] text-foreground px-4">
      <div className="absolute top-4 left-4">
        <Logo size="navbar" />
      </div>
      <Card className="w-full max-w-lg mx-4 shadow-lg border border-[rgba(255,255,255,0.08)] bg-[#0b0e12]/90 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-400" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-2">404</h1>

          <h2 className="text-xl font-semibold text-gray-300 mb-4">
            Page Not Found
          </h2>

          <p className="text-gray-400 mb-8 leading-relaxed">
            Sorry, the page you are looking for doesn't exist.
            <br />
            It may have been moved or deleted.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-[#c0c0c0] hover:bg-[#a8a8a8] text-black px-6 py-2.5 rounded-lg transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
