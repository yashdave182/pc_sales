import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemAvatar,
} from "@mui/material";

import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  Payment as PaymentIcon,
  Science as ScienceIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  CloudUpload as CloudUploadIcon,
  PhoneInTalk as PhoneInTalkIcon,
  LocalShipping as LocalShippingIcon,
  Brightness4,
  Brightness7,
  Notifications,
  Settings,
  AccountCircle,
  Language as LanguageIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";

import { useTranslation } from "../hooks/useTranslation";
import { useLanguageStore } from "../store/languageStore";
import type { Language } from "../i18n/i18n";
import { languages } from "../i18n/i18n";
import { useAuth } from "../contexts/AuthContext";

const drawerWidth = 260;

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  themeMode: "light" | "dark";
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    labelKey: "nav.dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
  },
  {
    id: "distributors",
    labelKey: "nav.distributors",
    icon: <GroupIcon />,
    path: "/distributors",
  },
  {
    id: "orders",
    labelKey: "nav.orders",
    icon: <LocalShippingIcon />,
    path: "/orders",
  },
  {
    id: "reports",
    labelKey: "nav.reports",
    icon: <AssessmentIcon />,
    path: "/reports",
  },
  {
    id: "calling-list",
    labelKey: "nav.callingList",
    icon: <PhoneInTalkIcon />,
    path: "/calling-list",
  },
  {
    id: "import",
    labelKey: "nav.import",
    icon: <CloudUploadIcon />,
    path: "/import",
  },
];

const adminNavigationItem: NavItem = {
  id: "admin",
  labelKey: "nav.admin",
  icon: <AdminIcon />,
  path: "/admin",
};

export default function Layout({
  children,
  toggleTheme,
  themeMode,
}: LayoutProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { user, signOut } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageAnchorEl(null);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    handleLanguageMenuClose();
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      handleUserMenuClose();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <Avatar
          src="/logo.jpg"
          alt="Sales Management Logo"
          sx={{
            width: 50,
            height: 50,
            bgcolor: "rgba(255, 255, 255, 0.2)",
          }}
        />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {t("common.salesManagementSystem").split(" ")[0]}
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontSize: "0.85rem" }}
          >
            {t("common.salesManagementSystem").split(" ").slice(1).join(" ")}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2, px: 1 }}>
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  backgroundColor: active
                    ? theme.palette.mode === "dark"
                      ? "rgba(144, 202, 249, 0.16)"
                      : "rgba(25, 118, 210, 0.08)"
                    : "transparent",
                  color: active ? theme.palette.primary.main : "inherit",
                  "&:hover": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(144, 202, 249, 0.08)"
                        : "rgba(25, 118, 210, 0.04)",
                  },
                  transition: "all 0.2s",
                }}
              >
                <ListItemIcon
                  sx={{
                    color: active ? theme.palette.primary.main : "inherit",
                    minWidth: 40,
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 500,
                    fontSize: "0.95rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {/* Admin Navigation Item - Only for admin@gmail.com */}
        {user?.email === "admin@gmail.com" && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(adminNavigationItem.path)}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  backgroundColor: isActive(adminNavigationItem.path)
                    ? theme.palette.mode === "dark"
                      ? "rgba(244, 67, 54, 0.16)"
                      : "rgba(211, 47, 47, 0.08)"
                    : "transparent",
                  color: isActive(adminNavigationItem.path)
                    ? "error.main"
                    : "inherit",
                  "&:hover": {
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(244, 67, 54, 0.08)"
                        : "rgba(211, 47, 47, 0.04)",
                  },
                  transition: "all 0.2s",
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(adminNavigationItem.path)
                      ? "error.main"
                      : "inherit",
                    minWidth: 40,
                  }}
                >
                  {adminNavigationItem.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(adminNavigationItem.labelKey, "Admin")}
                  primaryTypographyProps={{
                    fontWeight: isActive(adminNavigationItem.path) ? 600 : 500,
                    fontSize: "0.95rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          {t("common.version")} 1.0.0
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          {t("common.copyright")}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          boxShadow: theme.palette.mode === "dark" ? 1 : 2,
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 600 }}
          >
            {navigationItems.find((item) => item.path === location.pathname)
              ? t(
                  navigationItems.find(
                    (item) => item.path === location.pathname,
                  )?.labelKey || "nav.dashboard",
                )
              : t("nav.dashboard")}
          </Typography>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {/* Language Switcher */}
            <Tooltip title={t("layout.changeLanguage")}>
              <IconButton onClick={handleLanguageMenuOpen} color="inherit">
                <LanguageIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={languageAnchorEl}
              open={Boolean(languageAnchorEl)}
              onClose={handleLanguageMenuClose}
            >
              {(Object.keys(languages) as Language[]).map((lang) => (
                <MenuItem
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  selected={language === lang}
                >
                  {languages[lang]}
                </MenuItem>
              ))}
            </Menu>

            <Tooltip title={t("layout.toggleTheme")}>
              <IconButton onClick={toggleTheme} color="inherit">
                {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <Tooltip title={t("layout.notifications")}>
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={t("layout.settings")}>
              <IconButton color="inherit">
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title={user?.email || t("layout.profile")}>
              <IconButton color="inherit" onClick={handleUserMenuOpen}>
                <AccountCircle />
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Menu
              anchorEl={userMenuAnchorEl}
              open={Boolean(userMenuAnchorEl)}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem disabled>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </Avatar>
                </ListItemAvatar>
                <Box>
                  <Typography variant="subtitle2">
                    {user?.email || "User"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("layout.signedIn", "Signed In")}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("layout.logout", "Logout")}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
