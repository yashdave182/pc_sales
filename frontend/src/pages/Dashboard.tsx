import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  useTheme,
  Chip,
  Divider,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  TrendingUp,
  AttachMoney,
  People,
  Timeline,
  ShowChart,
  Receipt,
  PersonAdd,
  ShoppingCart,
  Science,
  Payment,
  ArrowForward,
  CheckCircle,
  Schedule,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../hooks/useTranslation";
import { dashboardAPI } from "../services/api";
import type {
  DashboardMetrics,
  SalesTrendData,
  RecentSale,
  UpcomingDemo,
} from "../types";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement;
  color: string;
  trend?: number;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}: MetricCardProps) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500, mb: 1 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color, mb: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box
                sx={{ display: "flex", alignItems: "center", mt: 1, gap: 0.5 }}
              >
                <TrendingUp
                  sx={{
                    fontSize: 16,
                    color: trend >= 0 ? "#4caf50" : "#f44336",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: trend >= 0 ? "#4caf50" : "#f44336",
                    fontWeight: 600,
                  }}
                >
                  {trend >= 0 ? "+" : ""}
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
              color: "white",
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [upcomingDemos, setUpcomingDemos] = useState<UpcomingDemo[]>([]);
  const [chartKey, setChartKey] = useState(0);
  const [loadingChart, setLoadingChart] = useState(false);
  const [salesDateRange, setSalesDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const loadSalesTrendByDateRange = useCallback(async () => {
    try {
      setLoadingChart(true);
      console.log("=== LOADING SALES TREND ===");
      console.log("Date range:", salesDateRange);
      console.log("Start date:", salesDateRange.start);
      console.log("End date:", salesDateRange.end);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://pc-sales-8phu.onrender.com";
      // Add cache buster to prevent browser caching
      const cacheBuster = `&_t=${Date.now()}`;
      const url = `${API_BASE_URL}/api/reports/sales-trend?interval=daily&start_date=${salesDateRange.start}&end_date=${salesDateRange.end}${cacheBuster}`;

      console.log("Full URL:", url);

      const response = await fetch(url, {
        headers: {
          "x-user-email": "admin@gmail.com",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
      });

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch sales trend:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw API response:", JSON.stringify(data, null, 2));
      console.log("Number of trends:", data.trends?.length || 0);

      // Check if API is respecting date parameters
      if (data.trends && data.trends.length > 0) {
        const firstDate = data.trends[0].period;
        const lastDate = data.trends[data.trends.length - 1].period;
        console.log(`API returned data from ${firstDate} to ${lastDate}`);
        console.log(`You requested from ${salesDateRange.start} to ${salesDateRange.end}`);

        if (firstDate < salesDateRange.start || lastDate > salesDateRange.end) {
          console.warn("⚠️ WARNING: API returned data outside requested range!");
          console.warn("This is a BACKEND issue - the API is not respecting date parameters");
        }
      }

      // Transform data for the chart
      const chartData = (data.trends || []).map((trend: any) => ({
        sale_date: trend.period,
        total_amount: parseFloat(trend.total_amount) || 0,
        sales_count: parseInt(trend.sales_count) || 0,
      }));

      console.log("Transformed chart data:", JSON.stringify(chartData, null, 2));
      console.log("Setting new chart data with", chartData.length, "points");

      setSalesTrend(chartData);
      setChartKey(prev => prev + 1);

    } catch (err) {
      console.error("=== ERROR LOADING SALES TREND ===");
      console.error("Error:", err);
      setSalesTrend([]);
    } finally {
      setLoadingChart(false);
    }
  }, [salesDateRange]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (salesDateRange.start && salesDateRange.end) {
      loadSalesTrendByDateRange();
    }
  }, [salesDateRange, loadSalesTrendByDateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, salesData, demosData] = await Promise.all([
        dashboardAPI.getMetrics(),
        dashboardAPI.getRecentSales(10),
        dashboardAPI.getUpcomingDemos(10),
      ]);

      setMetrics(metricsData);
      setRecentSales(salesData);
      setUpcomingDemos(demosData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data",
      );
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    const isNetworkError =
      error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("reach server") ||
      error.toLowerCase().includes("cors");

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            maxWidth: 500,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            {isNetworkError
              ? "Unable to Connect to Server"
              : "Error Loading Dashboard"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isNetworkError
              ? "The backend server may be sleeping or unavailable. This is common with free-tier hosting. Please click refresh to wake it up."
              : error}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setError(null);
              loadDashboardData();
            }}
          >
            Refresh Page
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!metrics) {
    return null;
  }

  // Payment chart logic removed in favor of simple metric display
  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          👋 {t("dashboard.welcomeBack")}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: "1.05rem" }}
        >
          {t("dashboard.subtitle")}
        </Typography>
      </Box>

      {/* Quick Action Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/customers")}
          >
            <CardContent>
              <PersonAdd sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("dashboard.quickActions.addCustomer.title")}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {t("dashboard.quickActions.addCustomer.subtitle")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/sales")}
          >
            <CardContent>
              <ShoppingCart sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("dashboard.quickActions.newSale.title")}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {t("dashboard.quickActions.newSale.subtitle")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/demos")}
          >
            <CardContent>
              <Science sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("dashboard.quickActions.scheduleDemo.title")}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {t("dashboard.quickActions.scheduleDemo.subtitle")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={6} md={3}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/payments")}
          >
            <CardContent>
              <Payment sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("dashboard.quickActions.recordPayment.title")}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {t("dashboard.quickActions.recordPayment.subtitle")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("dashboard.totalSales")}
            value={`₹${metrics.total_sales.toLocaleString()}`}
            subtitle={`${metrics.total_transactions} ${t("dashboard.transactions")}`}
            icon={<AttachMoney sx={{ fontSize: 32 }} />}
            color="#1976d2"
            trend={12.5}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("dashboard.pendingPayments")}
            value={`₹${metrics.pending_amount.toLocaleString()}`}
            subtitle={t("dashboard.outstandingAmount")}
            icon={<Receipt sx={{ fontSize: 32 }} />}
            color="#ed6c02"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("dashboard.totalCustomers")}
            value={metrics.total_customers}
            subtitle={t("dashboard.activeCustomers")}
            icon={<People sx={{ fontSize: 32 }} />}
            color="#2e7d32"
            trend={8.3}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title={t("dashboard.demoConversion")}
            value={`${metrics?.demo_conversion_rate ?? 0}%`}
            subtitle={t("dashboard.conversionRate")}
            icon={<Timeline sx={{ fontSize: 32 }} />}
            color="#9c27b0"
            trend={5.2}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <ShowChart sx={{ mr: 1, color: theme.palette.primary.main }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Sales Trend
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <TextField
                    type="date"
                    size="small"
                    label="From"
                    value={salesDateRange.start}
                    onChange={(e) => setSalesDateRange({ ...salesDateRange, start: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <TextField
                    type="date"
                    size="small"
                    label="To"
                    value={salesDateRange.end}
                    onChange={(e) => setSalesDateRange({ ...salesDateRange, end: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 150 }}
                  />
                  <Tooltip title="Refresh">
                    <IconButton
                      size="small"
                      onClick={loadSalesTrendByDateRange}
                      color="primary"
                      disabled={loadingChart}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {loadingChart ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <CircularProgress />
                </Box>
              ) : salesTrend.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, flexDirection: 'column' }}>
                  <ShowChart sx={{ fontSize: 64, color: theme.palette.text.disabled, mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No sales data available for selected date range
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                  key={chartKey}
                >
                  <LineChart data={salesTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      dataKey="sale_date"
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: "12px" }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total_amount"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Sales Amount (₹)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Collected Payments Display */}
        <Grid item xs={12} lg={4}>
          <Card
            sx={{
              height: "100%",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <Box sx={{
              position: "absolute",
              right: -20,
              top: -20,
              opacity: 0.1,
              transform: "rotate(15deg)"
            }}>
              <Payment sx={{ fontSize: 180 }} />
            </Box>
            <CardContent sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, opacity: 0.9 }}>
                Collected Payments
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
                {salesDateRange.start && salesDateRange.end
                  ? `${new Date(salesDateRange.start).toLocaleDateString()} - ${new Date(salesDateRange.end).toLocaleDateString()}`
                  : "All Time"}
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 700 }}>
                ₹{metrics.total_payments.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        {/* Recent Sales */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t("dashboard.recentSales")}
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/sales")}
                >
                  View All
                </Button>
              </Box>
              <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                {recentSales.length > 0 ? (
                  recentSales.slice(0, 5).map((sale, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 2.5,
                        mb: 1.5,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: theme.palette.action.hover,
                          transform: "translateX(4px)",
                          borderColor: theme.palette.primary.main,
                        },
                      }}
                      onClick={() => navigate("/sales")}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Chip
                            label={sale.invoice_no}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                          />
                          {sale.payment_status === "Paid" && (
                            <CheckCircle
                              sx={{ fontSize: 16, color: "#10b981" }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        >
                          {sale.customer_name}
                        </Typography>
                        <Box
                          sx={{ display: "flex", gap: 2, alignItems: "center" }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            📍 {sale.village || "N/A"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            📅 {new Date(sale.sale_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: "right", ml: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: theme.palette.primary.main,
                            mb: 0.5,
                          }}
                        >
                          ₹{sale.total_amount.toLocaleString()}
                        </Typography>
                        <Chip
                          label={sale.payment_status}
                          size="small"
                          sx={{
                            bgcolor:
                              sale.payment_status === "Paid"
                                ? "#10b98120"
                                : sale.payment_status === "Partial"
                                  ? "#f59e0b20"
                                  : "#ef444420",
                            color:
                              sale.payment_status === "Paid"
                                ? "#10b981"
                                : sale.payment_status === "Partial"
                                  ? "#f59e0b"
                                  : "#ef4444",
                            fontWeight: 600,
                            fontSize: "0.7rem",
                          }}
                        />
                      </Box>
                    </Paper>
                  ))
                ) : (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <Receipt
                      sx={{
                        fontSize: 64,
                        color: theme.palette.text.disabled,
                        mb: 2,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {t("dashboard.noRecentSales")}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<ShoppingCart />}
                      sx={{ mt: 2 }}
                      onClick={() => navigate("/sales")}
                    >
                      Create First Sale
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Demos */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t("dashboard.upcomingDemos")}
                </Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate("/demos")}
                >
                  View All
                </Button>
              </Box>
              <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                {upcomingDemos.length > 0 ? (
                  upcomingDemos.slice(0, 5).map((demo, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 2.5,
                        mb: 1.5,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        borderLeft: `4px solid ${theme.palette.secondary.main}`,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:hover": {
                          bgcolor: theme.palette.action.hover,
                          transform: "translateX(4px)",
                          borderLeftColor: theme.palette.secondary.dark,
                        },
                      }}
                      onClick={() => navigate("/demos")}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          >
                            {demo.customer_name}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Science
                              sx={{
                                fontSize: 16,
                                color: theme.palette.secondary.main,
                              }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {demo.product_name}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={`#${demo.demo_id}`}
                          size="small"
                          color="secondary"
                          sx={{ fontWeight: 600, fontSize: "0.7rem" }}
                        />
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          icon={<Schedule sx={{ fontSize: 14 }} />}
                          label={new Date(demo.demo_date).toLocaleDateString()}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                        <Chip
                          label={demo.demo_time}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                        {demo.village && (
                          <Chip
                            label={demo.village}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    </Paper>
                  ))
                ) : (
                  <Box sx={{ textAlign: "center", py: 6 }}>
                    <Science
                      sx={{
                        fontSize: 64,
                        color: theme.palette.text.disabled,
                        mb: 2,
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {t("dashboard.noUpcomingDemos")}
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Science />}
                      sx={{ mt: 2 }}
                      onClick={() => navigate("/demos")}
                    >
                      {t("dashboard.scheduleDemoCta")}
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}