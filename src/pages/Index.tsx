import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Eye, Lock, Search, TrendingUp, AlertTriangle, Zap, CheckCircle, BarChart3 } from "lucide-react";

const Index = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const FloatingElement = ({ 
    icon: Icon, 
    className, 
    delay = 0,
    size = "w-8 h-8"
  }: { 
    icon: any; 
    className: string; 
    delay?: number;
    size?: string;
  }) => (
    <div
      className={`absolute ${size} ${className} animate-float opacity-20 dark:opacity-30`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: "8s",
        transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
        transition: "transform 0.6s ease-out"
      }}
    >
      <Icon className="w-full h-full text-primary/40" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <FloatingElement icon={Shield} className="top-16 left-16" delay={0} size="w-6 h-6" />
      <FloatingElement icon={Eye} className="top-24 right-24" delay={2} size="w-5 h-5" />
      <FloatingElement icon={Lock} className="top-32 right-16" delay={4} size="w-4 h-4" />
      <FloatingElement icon={Search} className="top-20 left-1/3" delay={1} size="w-5 h-5" />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-8">
        <div className="text-center space-y-12 w-full mx-auto">
          {/* Logo */}
          <div className="mx-auto w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mb-8 animate-fade-in shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>

          {/* Hero Text */}
          <div className="space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground animate-fade-in">
              <span className="bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Antifraudster
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground animate-fade-in max-w-3xl mx-auto" style={{ animationDelay: "0.2s" }}>
              Advanced AI-Powered Fraud Detection System
            </p>
            <p className="text-lg text-muted-foreground animate-fade-in max-w-2xl mx-auto" style={{ animationDelay: "0.4s" }}>
              Protect your e-commerce business with real-time multi-perspective fraud analysis
            </p>
          </div>

          {/* Key Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 my-16 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/30 dark:border-slate-700/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-3">Real-Time Detection</h3>
              <p className="text-sm text-muted-foreground">Instant fraud analysis with {"<"}100ms response time</p>
            </div>
            
            <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/30 dark:border-slate-700/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-3">Multi-Perspective Analysis</h3>
              <p className="text-sm text-muted-foreground">Advanced ML algorithms with explainable AI</p>
            </div>
            
            <div className="group bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/30 dark:border-slate-700/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-3">Pre-Payment Blocking</h3>
              <p className="text-sm text-muted-foreground">Stop fraud before payment processing</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <Link to="/signup">
              <Button className="gradient-primary hover:opacity-90 transition-all duration-300 px-8 py-3 text-lg font-medium shadow-lg hover:shadow-xl hover:scale-105">
                Start Protecting Now
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="px-8 py-3 text-lg font-medium border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 animate-fade-in" style={{ animationDelay: "1s" }}>
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-safe to-safe/80 bg-clip-text text-transparent group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-sm text-muted-foreground mt-2">Accuracy Rate</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">{"<"}100ms</div>
              <div className="text-sm text-muted-foreground mt-2">Detection Speed</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl font-bold bg-gradient-to-r from-suspicious to-warning bg-clip-text text-transparent group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-sm text-muted-foreground mt-2">Protection</div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 animate-fade-in" style={{ animationDelay: "1.2s" }}>
            <p className="text-sm text-muted-foreground mb-6">Trusted by e-commerce businesses worldwide</p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-lg"></div>
              <div className="w-8 h-8 bg-gradient-to-r from-safe to-green-600 rounded-lg"></div>
              <div className="w-8 h-8 bg-gradient-to-r from-suspicious to-orange-600 rounded-lg"></div>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
