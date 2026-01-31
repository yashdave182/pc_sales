import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  useTheme,
} from "@mui/material";
import { TableSkeleton, ChartSkeleton } from "../components/Skeletons";
import {
  Payment as PaymentIcon,
  PictureAsPdf as PdfIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { reportsAPI } from "../services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface SalesTrendData {
  period: string;
  sales_count: number;
  total_amount: number;
  total_liters: number;
}

interface PaymentTrendData {
  period: string;
  payment_count: number;
  total_amount: number;
  payment_methods: Record<string, number>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function Reports() {
  const { user } = useAuth();
  const theme = useTheme();
  const [interval, setInterval] = useState("daily");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const [salesTrends, setSalesTrends] = useState<SalesTrendData[]>([]);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrendData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);

  // Load sales trends
  const loadSalesTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await reportsAPI.getSalesTrend({
        interval,
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      setSalesTrends(data.trends || []);
      setSalesSummary(data.summary || null);
    } catch (err: any) {
      console.error("Error loading sales trends:", err);
      setError(err?.message || "Failed to load sales trends");
    } finally {
      setLoading(false);
    }
  };

  // Load payment trends
  const loadPaymentTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await reportsAPI.getPaymentTrend({
        interval,
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      setPaymentTrends(data.trends || []);
      setPaymentSummary(data.summary || null);
    } catch (err: any) {
      console.error("Error loading payment trends:", err);
      setError(err?.message || "Failed to load payment trends");
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    try {
      setPdfLoading(true);
      setError(null);
      setSuccess(null);

      const blob = await reportsAPI.getSalesOrderSummaryPdf({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales_order_summary_${dateRange.start}_to_${dateRange.end}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess("PDF generated and downloaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      setError(err?.message || "Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const loadAllData = () => {
    loadSalesTrends();
    loadPaymentTrends();
  };

  useEffect(() => {
    if (user?.email) {
      loadAllData();
    }
  }, [user, interval, dateRange]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Advanced Reports & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Analyze sales trends, payment patterns, and generate comprehensive PDF reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="From"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="To"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Interval"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={pdfLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                onClick={generatePDF}
                disabled={pdfLoading}
              >
                {pdfLoading ? "Generating..." : "Generate PDF"}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Sales Trends Summary
                </Typography>
              </Box>
              {salesSummary && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
                    </Typography>
                    <Typography variant="h6">{salesSummary.total_sales}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                    <Typography variant="h6">₹{salesSummary.total_revenue?.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Liters
                    </Typography>
                    <Typography variant="h6">{salesSummary.total_liters?.toFixed(2)} L</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Sales/Period
                    </Typography>
                    <Typography variant="h6">{salesSummary.avg_sales_per_period}</Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PaymentIcon sx={{ mr: 1, color: "success.main" }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Payment Trends Summary
                </Typography>
              </Box>
              {paymentSummary && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Payments
                    </Typography>
                    <Typography variant="h6">{paymentSummary.total_payments}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h6">₹{paymentSummary.total_amount?.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Periods
                    </Typography>
                    <Typography variant="h6">{paymentSummary.periods_count}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Avg Amount/Period
                    </Typography>
                    <Typography variant="h6">₹{paymentSummary.avg_amount_per_period}</Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Visualizations Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Sales Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Sales Revenue Trend
              </Typography>
              {loading ? (
                <ChartSkeleton height={300} />
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="period" stroke={theme.palette.text.secondary} style={{ fontSize: '12px' }} />
                    <YAxis stroke={theme.palette.text.secondary} style={{ fontSize: '12px' }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total_amount" stroke={theme.palette.primary.main} strokeWidth={3} name="Revenue (₹)" />
                    <Line type="monotone" dataKey="sales_count" stroke={theme.palette.secondary.main} strokeWidth={2} name="Sales Count" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Methods Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Payment Methods
              </Typography>
              {loading ? (
                <ChartSkeleton height={300} />
              ) : paymentSummary?.payment_methods ? (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={Object.entries(paymentSummary.payment_methods).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {Object.entries(paymentSummary.payment_methods).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography color="text.secondary">No payment method data</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Raw Data Tables */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Detailed Sales Data
              </Typography>
              {loading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Sales</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Liters</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {salesTrends.map((trend, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{trend.period}</TableCell>
                          <TableCell align="right">{trend.sales_count}</TableCell>
                          <TableCell align="right">₹{trend.total_amount.toFixed(2)}</TableCell>
                          <TableCell align="right">{trend.total_liters.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
