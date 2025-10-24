import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Heart, 
  Users, 
  Calendar, 
  User, 
  Plus, 
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  Book,
  Home,
  MessageCircle,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NotificationBell from "./NotificationBell";
import type { User as SupabaseUser } from '@supabase/supabase-js';

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTabletMenuOpen, setIsTabletMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsAdmin(session.user.email === 'candelaz28@gmail.com');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAdmin(session.user.email === 'candelaz28@gmail.com');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "แล้วพบกันใหม่!",
      });
      navigate("/auth");
    }
  };

  const handleSettingsClick = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      toast({
        title: "ไม่มีสิทธิ์เข้าถึง",
        description: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงการตั้งค่าได้",
        variant: "destructive"
      });
    }
  };

  const navItems = [
    { path: "/", label: "หน้าหลัก", icon: Home },
    { path: "/all-prayers", label: "คำอธิษฐานทั้งหมด", icon: Heart },
    { path: "/bible-reading", label: "พระคัมภีร์", icon: Book },
    { path: "/accounting", label: "บัญชี", icon: Wallet },
    { path: "/groups", label: "กลุ่มดูแล", icon: Users },
    { path: "/calendar", label: "ปฏิทิน", icon: Calendar },
    { path: "/profile", label: "โปรไฟล์", icon: User },
  ];

  const mobileNavItems = [
    { path: "/", label: "หน้าหลัก", icon: Home },
    { path: "/all-prayers", label: "คำอธิษฐาน", icon: Heart },
    { path: "/bible-reading", label: "พระคัมภีร์", icon: Book },
    { path: "/accounting", label: "บัญชี", icon: Wallet },
    { path: "/groups", label: "กลุ่ม", icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-between px-6 py-4 bg-card/60 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow overflow-hidden">
              <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold text-black">
                NexusLife
              </h1>
              <p className="text-xs text-muted-foreground">ชุมชนแห่งการอธิษฐาน</p>
            </div>
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 px-3",
                      isActive(item.path) 
                        ? "nav-active shadow-purple-500/20" 
                        : "hover:bg-accent"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4",
                      isActive(item.path) ? "nav-active-icon" : ""
                    )} />
                    <span className={cn(
                      isActive(item.path) ? "nav-active-text" : ""
                    )}>
                      {item.label}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link to="/new-prayer">
            <Button variant="divine" size="sm">
              <Plus className="w-4 h-4" />
              คำอธิษฐานใหม่
            </Button>
          </Link>
          
          <NotificationBell />
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSettingsClick}
            title={isAdmin ? "การจัดการระบบ" : "การตั้งค่า"}
          >
            <Settings className="w-4 h-4" />
          </Button>

          {user && (
            <Button variant="ghost" size="icon" onClick={handleLogout} title="ออกจากระบบ">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </nav>

      {/* Tablet Navigation */}
      <nav className="hidden md:flex lg:hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-md border-b border-border/50 w-full">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
              <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-semibold text-black">
              NexusLife
            </span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Link to="/new-prayer">
              <Button variant="divine" size="sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">ใหม่</span>
              </Button>
            </Link>
            <NotificationBell />
            <Sheet open={isTabletMenuOpen} onOpenChange={setIsTabletMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-4 border-b">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
                      <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-serif font-semibold">เมนู</span>
                  </div>
                  
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="block"
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start",
                              isActive(item.path) ? "nav-active" : ""
                            )}
                          >
                            <Icon className={cn(
                              "w-4 h-4 mr-3",
                              isActive(item.path) ? "nav-active-icon" : ""
                            )} />
                            <span className={cn(
                              isActive(item.path) ? "nav-active-text" : ""
                            )}>
                              {item.label}
                            </span>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                  
                  <div className="pt-4 border-t space-y-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={handleSettingsClick}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      {isAdmin ? "การจัดการระบบ" : "การตั้งค่า"}
                    </Button>
                    
                    {user && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-500 hover:text-red-600"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        ออกจากระบบ
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

              {/* Mobile Navigation */}
      <nav className="md:hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/60 backdrop-blur-md border-b border-border/50">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
              <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-semibold text-black">
              NexusLife
            </span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-4 border-b">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
                      <img src="/logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-serif font-semibold">เมนู</span>
                  </div>
                  
                  <div className="space-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="block"
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start",
                              isActive(item.path) ? "nav-active" : ""
                            )}
                          >
                            <Icon className={cn(
                              "w-4 h-4 mr-3",
                              isActive(item.path) ? "nav-active-icon" : ""
                            )} />
                            <span className={cn(
                              isActive(item.path) ? "nav-active-text" : ""
                            )}>
                              {item.label}
                            </span>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                  
                  <div className="pt-4 border-t space-y-2">
                    <Link to="/new-prayer">
                      <Button variant="divine" className="w-full">
                        <Plus className="w-4 h-4 mr-3" />
                        คำอธิษฐานใหม่
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={handleSettingsClick}
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      {isAdmin ? "การจัดการระบบ" : "การตั้งค่า"}
                    </Button>
                    
                    {user && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-red-500 hover:text-red-600"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        ออกจากระบบ
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 z-50 md:hidden">
          <div className="flex items-center justify-around px-2 py-2">
            {/* Left side navigation items */}
            <div className="flex items-center justify-around flex-1">
              {mobileNavItems.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex flex-col items-center justify-center w-full py-2"
                  >
                    <div className={cn(
                      "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
                      isActive(item.path) 
                        ? "nav-active-bg nav-active-text" 
                        : "text-gray-600 hover:text-gray-900"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isActive(item.path) ? "nav-active-icon" : "text-gray-600"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        isActive(item.path) ? "nav-active-text" : "text-gray-600"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            
            {/* Center Quick Add Button */}
            <div className="flex flex-col items-center justify-center px-4 py-2">
              <Link to="/new-prayer">
                <div className="flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors">
                  <div className="w-12 h-12 bg-gradient-divine rounded-full flex items-center justify-center shadow-glow">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-medium text-primary">สร้างอธิษฐานใหม่</span>
                </div>
              </Link>
            </div>
            
            {/* Right side navigation items */}
            <div className="flex items-center justify-around flex-1">
              {mobileNavItems.slice(2).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex flex-col items-center justify-center w-full py-2"
                  >
                    <div className={cn(
                      "flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors",
                      isActive(item.path) 
                        ? "nav-active-bg nav-active-text" 
                        : "text-gray-600 hover:text-gray-900"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isActive(item.path) ? "nav-active-icon" : "text-gray-600"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        isActive(item.path) ? "nav-active-text" : "text-gray-600"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom padding for mobile to account for bottom navigation */}
      <div className="md:hidden h-20"></div>
    </>
  );
};

export default Navigation;