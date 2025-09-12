"use client";

import { Button } from "@/components/ui/button";
import { MdMenu } from "react-icons/md";
import Image from "next/image";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <div className="lg:hidden bg-background border-b border-border px-4 py-3 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center">
        <Image
          src="/logo.png"
          alt="Bayyena Logo"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="ml-2 text-lg font-semibold text-foreground">
          Bayyena
        </span>
      </div>

      {/* Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10"
        onClick={onMenuClick}
      >
        <MdMenu className="h-5 w-5" />
      </Button>
    </div>
  );
}
