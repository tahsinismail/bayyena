"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  MdMenu,
  MdLanguage,
  MdDarkMode,
  MdLightMode
} from "react-icons/md";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, dir } = useLanguage();

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <MdMenu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center lg:gap-4">
          <div className="flex items-center lg:gap-2">
            <Image 
              src="/logo.png" 
              alt="Bayyena" 
              width={32} 
              height={32} 
              className="hidden lg:flex w-8 h-8 object-contain"
            />
            <span className={`text-sm lg:text-xl font-bold text-foreground ${language === 'ar' ? 'text-arabic' : ''}`}>
              {language === 'ar' ? 'بيينة' : 'Bayyena'}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full"
          onClick={toggleLanguage}
          title={t(language === 'en' ? 'topbar.switchToArabic' : 'topbar.switchToEnglish')}
        >
          <MdLanguage className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8"
          onClick={toggleTheme}
          title={t(theme === 'light' ? 'topbar.switchToDark' : 'topbar.switchToLight')}
        >
          {theme === 'light' ? (
            <MdDarkMode className="h-4 w-4" />
          ) : (
            <MdLightMode className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
