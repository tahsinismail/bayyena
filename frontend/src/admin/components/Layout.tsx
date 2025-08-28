// frontend/src/admin/components/Layout.tsx
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "../../hooks/useAuth";
import axios from "axios";
import {
  Flex,
  Box,
  Text,
  Button,
  Avatar,
  DropdownMenu,
  ScrollArea,
  Theme
} from "@radix-ui/themes";
import {
  DashboardIcon,
  PersonIcon,
  ActivityLogIcon,
  GearIcon,
  ExitIcon,
  ChevronRightIcon,
  HamburgerMenuIcon,
  Cross1Icon
} from "@radix-ui/react-icons";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation();
  const { user, setUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout on client side
      setUser(null);
      window.location.href = '/login';
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const menuItems = [
    {
      key: "/admin",
      icon: <DashboardIcon />,
      label: "Dashboard",
      path: "/admin"
    },
    {
      key: "/admin/users",
      icon: <PersonIcon />,
      label: "Users",
      path: "/admin/users"
    },
    {
      key: "/admin/activity",
      icon: <ActivityLogIcon />,
      label: "User Activity",
      path: "/admin/activity"
    },
    {
      key: "/admin/admin-activity",
      icon: <GearIcon />,
      label: "Admin Activity",
      path: "/admin/admin-activity"
    },
  ];

  return (
    <Theme appearance="light" accentColor="gold" grayColor="slate" radius="medium">
      <Flex direction="column" width="100vw" height="100vh" style={{ backgroundColor: 'var(--gray-1)' }}>
        {/* Header */}
        <Box
          style={{
            backgroundColor: 'white',
            borderBottom: '1px solid var(--gray-6)',
            padding: '2rem 1rem',
            height: '4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <Flex align="center" gap="4">
            {isMobile && (
              <Button
                variant="ghost"
                size="3"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
              </Button>
            )}
            <Text size="5" weight="bold" color="gold">
              Bayyena Admin
            </Text>
          </Flex>

          <Flex align="center" gap="4">
            {!isMobile && (
              <Link
                to="/"
                style={{
                  color: 'var(--gray-11)',
                  textDecoration: 'none',
                  fontSize: '0.875rem'
                }}
              >
                ← Back to Main App
              </Link>
            )}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button variant="ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Avatar
                    size="2"
                    fallback={user?.fullName?.charAt(0) || "A"}
                    style={{ border: '1px solid var(--gold-9)'}}
                  />
                  <Text size="2">{user?.fullName || "Admin"}</Text>
                  <ChevronRightIcon style={{ transform: 'rotate(90deg)' }} />
                </Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Content align="end" style={{ minWidth: '12rem' }}>
                <DropdownMenu.Item onClick={handleLogout} style={{ color: 'var(--red-11)' }}>
                  <ExitIcon style={{ marginRight: '0.5rem' }} />
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>
        </Box>

        <Flex flexGrow="1">
          {/* Sidebar */}
          {(!isMobile || isMobileMenuOpen) && (
            <Box
              style={{
                width: isMobile ? '100%' : (sidebarOpen ? '16rem' : '4rem'),
                backgroundColor: 'white',
                borderRight: '1px solid var(--gray-6)',
                transition: 'width 0.2s ease',
                overflow: 'hidden',
                position: isMobile ? 'absolute' : 'relative',
                top: isMobile ? '4rem' : 'auto',
                left: isMobile ? '0' : 'auto',
                height: isMobile ? '100vh' : 'auto',
                zIndex: isMobile ? 50 : 'auto',
                boxShadow: isMobile ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              <ScrollArea style={{ height: '100%' }}>
                <Box p="4">
                  <Flex direction="column" gap="2">
                    {menuItems.map((item) => (
                      <Link key={item.key} to={item.path} style={{ textDecoration: 'none' }} onClick={closeMobileMenu}>
                        <Button
                          variant={location === item.key ? "soft" : "ghost"}
                          style={{
                            width: '100%',
                            justifyContent: 'flex-start',
                            padding: '0.75rem 1rem',
                            fontSize: '0.875rem'
                          }}
                        >
                          <Flex align="center" gap="3">
                            {item.icon}
                            {(sidebarOpen || isMobile) && <Text>{item.label}</Text>}
                          </Flex>
                        </Button>
                      </Link>
                    ))}
                  </Flex>
                </Box>
              </ScrollArea>
            </Box>
          )}

          {/* Main Content */}
          <Box flexGrow="1" style={{ backgroundColor: 'var(--gray-1)' }}>
            <ScrollArea style={{ height: '100%' }}>
              <Box p={isMobile ? "4" : "6"}>
                {children}
              </Box>
            </ScrollArea>
          </Box>
        </Flex>

        {/* Mobile Menu Overlay */}
        {isMobile && isMobileMenuOpen && (
          <Box
            style={{
              position: 'fixed',
              top: '4rem',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 40,
            }}
            onClick={closeMobileMenu}
          />
        )}
      </Flex>
    </Theme>
  );
};
