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
  Select,
} from "@mui/material";
import { TableSkeleton } from "../components/Skeletons";
import {
  Description as DescriptionIcon,
  Payment as PaymentIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://pc-sales-8phu.onrender.com";

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

export default function ReportsEnhanced() {
  const { user } = useAuth();
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

      const response = await axios.get(`${API_BASE_URL}/api/reports/sales-trend`, {
        params: {
          interval,
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
        headers: {
          "x-user-email": user?.email,
        },
      });

      setSalesTrends(response.data.trends || []);
      setSalesSummary(response.data.summary || null);
    } catch (err: any) {
      console.error("Error loading sales trends:", err);
      setError(err.response?.data?.detail || "Failed to load sales trends");
    } finally {
      setLoading(false);
    }
  };

  // Load payment trends
  const loadPaymentTrends = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/api/reports/payment-trend`, {
        params: {
          interval,
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
        headers: {
          "x-user-email": user?.email,
        },
      });

      setPaymentTrends(response.data.trends || []);
      setPaymentSummary(response.data.summary || null);
    } catch (err: any) {
      console.error("Error loading payment trends:", err);
      setError(err.response?.data?.detail || "Failed to load payment trends");
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

      const response = await axios.get(
        `${API_BASE_URL}/api/reports/sales-order-summary-pdf`,
        {
          params: {
            start_date: dateRange.start,
            end_date: dateRange.end,
          },
          headers: {
            "x-user-email": user?.email,
          },
          responseType: "blob",
        }
      );

      // Create download link
      const blob = new Blob([response.data], { type: "application/pdf" });
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
      setError(err.response?.data?.detail || "Failed to generate PDF");
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
                startIcon={pdfLoading ? <CircularProgress size={20} /> : <PdfIcon />}
                onClick={generatePDF}
                disabled={pdfLoading}
              >
                Generate PDF
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

      {/* Sales Trends Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Sales Trend Analysis ({interval})
          </Typography>

          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Sales Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Liters</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Avg per Sale</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesTrends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No sales data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesTrends.map((trend, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Chip label={trend.period} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{trend.sales_count}</TableCell>
                        <TableCell align="right">₹{trend.total_amount.toFixed(2)}</TableCell>
                        <TableCell align="right">{trend.total_liters.toFixed(2)} L</TableCell>
                        <TableCell align="right">
                          ₹{(trend.total_amount / trend.sales_count || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Payment Trends Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            <PaymentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Payment Trend Analysis ({interval})
          </Typography>

          {loading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Payment Count</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Avg per Payment</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Payment Methods</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paymentTrends.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No payment data available for this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentTrends.map((trend, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Chip label={trend.period} size="small" color="success" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{trend.payment_count}</TableCell>
                        <TableCell align="right">₹{trend.total_amount.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          ₹{(trend.total_amount / trend.payment_count || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {Object.entries(trend.payment_methods).map(([method, count]) => (
                              <Chip
                                key={method}
                                label={`${method}: ${count}`}
                                size="small"
                                variant="filled"
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
