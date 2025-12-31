import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
} from "@mui/icons-material";
import { useTranslation } from "../hooks/useTranslation";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <AssessmentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("reports.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("reports.subtitle", "Generate comprehensive reports and insights")}
        </Typography>
      </Box>

      {/* Date Range Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label={t("reports.from")}
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
                label={t("reports.to")}
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
                label={t("reports.quickSelect", "Quick Select")}
                defaultValue="custom"
              >
                <MenuItem value="custom">
                  {t("reports.customRange", "Custom Range")}
                </MenuItem>
                <MenuItem value="today">{t("reports.today", "Today")}</MenuItem>
                <MenuItem value="yesterday">
                  {t("reports.yesterday", "Yesterday")}
                </MenuItem>
                <MenuItem value="week">
                  {t("reports.thisWeek", "This Week")}
                </MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<DownloadIcon />}
              >
                Generate Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="report tabs"
          >
            <Tab label="Sales Reports" />
            <Tab label="Customer Reports" />
            <Tab label="Payment Reports" />
            <Tab label="Product Reports" />
            <Tab label="Distributor Reports" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Sales Reports
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Sales Summary
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Overview of total sales, revenue, and transactions
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Sales Trend Analysis
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Daily, weekly, and monthly sales trends
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Product Performance
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Best selling products and categories
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Village-wise Sales
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Sales distribution by location
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Customer Reports
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Customer Overview
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Total customers, active/inactive status
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Top Customers
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Customers by total purchase value
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Geographic Distribution
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Customers by village, taluka, district
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Customer Lifetime Value
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Total value by customer over time
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Payment Reports
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Payment Summary
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Total payments received and pending
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Payment Methods Analysis
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Breakdown by payment method
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Aging Analysis
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Pending payments by age
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Collection Efficiency
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Payment collection metrics
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Product Reports
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Product Performance
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Sales by product
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Category Analysis
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Performance by product category
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom>
              Distributor Reports
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Distributor Overview
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Total distributors and coverage
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      gutterBottom
                    >
                      Performance Metrics
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      Top performing distributors
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      size="small"
                    >
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
