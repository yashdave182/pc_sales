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
  Brightness4,
  Brightness7,
  Notifications,
  Settings,
  AccountCircle,
} from "@mui/icons-material";

const drawerWidth = 260;

interface LayoutProps {
  children: React.ReactNode;
  toggleTheme: () => void;
  themeMode: "light" | "dark";
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  path: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <DashboardIcon />,
    path: "/dashboard",
  },
  {
    id: "customers",
    label: "Customers",
    icon: <PeopleIcon />,
    path: "/customers",
  },
  {
    id: "sales",
    label: "Sales",
    icon: <ShoppingCartIcon />,
    path: "/sales",
  },
  {
    id: "payments",
    label: "Payments",
    icon: <PaymentIcon />,
    path: "/payments",
  },
  {
    id: "demos",
    label: "Demos",
    icon: <ScienceIcon />,
    path: "/demos",
  },
  {
    id: "distributors",
    label: "Distributors",
    icon: <GroupIcon />,
    path: "/distributors",
  },
  {
    id: "reports",
    label: "Reports",
    icon: <AssessmentIcon />,
    path: "/reports",
  },
  {
    id: "import",
    label: "Data Import",
    icon: <CloudUploadIcon />,
    path: "/import",
  },
];

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
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
          sx={{
            width: 50,
            height: 50,
            bgcolor: "rgba(255, 255, 255, 0.2)",
            fontSize: "1.5rem",
          }}
        >
          📊
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Sales
          </Typography>
          <Typography
            variant="body2"
            sx={{ opacity: 0.9, fontSize: "0.85rem" }}
          >
            Management System
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
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 500,
                    fontSize: "0.95rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Footer */}
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Version 1.0.0
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          © 2025 Sales Management
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
              ?.label || "Dashboard"}
          </Typography>

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title="Toggle theme">
              <IconButton onClick={toggleTheme} color="inherit">
                {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton color="inherit">
                <Settings />
              </IconButton>
            </Tooltip>

            <Tooltip title="Profile">
              <IconButton color="inherit">
                <AccountCircle />
              </IconButton>
            </Tooltip>
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
