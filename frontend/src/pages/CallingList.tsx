import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  TextField,
  Button,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Payments as PaymentsIcon,
  Schedule as ScheduleIcon,
  WarningAmber as WarningIcon,
  Person as PersonIcon,
  Place as PlaceIcon,
  Event as EventIcon,
  Insights as InsightsIcon,
} from "@mui/icons-material";
import { automationAPI } from "../services/api";

type CallingListItem = {
  customer_id?: number;
  name?: string;
  mobile?: string;
  village?: string;
  taluka?: string;
  last_purchase_date?: string | null;
  days_since_purchase?: number;
  lifetime_value?: number;
  total_purchases?: number;
  product_name?: string | null;
  demo_date?: string | null;
  follow_up_date?: string | null;
  conversion_status?: string | null;
  outstanding_balance?: number;
  last_sale_date?: string | null;
  priority?: "High" | "Medium" | "Low";
  reason?: string;
  [key: string]: any;
};

type CallingListResponse = {
  generated_at: string;
  inactive_days_threshold: number;
  summary: {
    total_inactive_customers: number;
    total_pending_demos: number;
    total_outstanding_payments: number;
    total_calls_suggested: number;
  };
  calling_priorities: {
    high_priority: CallingListItem[];
    medium_priority: CallingListItem[];
    low_priority: CallingListItem[];
  };
  segments: {
    inactive_customers: CallingListItem[];
    demo_followups: CallingListItem[];
    outstanding_payments: CallingListItem[];
  };
};

function Metric({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: React.ReactElement;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${color}33`,
        bgcolor: `${color}0A`,
        minWidth: 180,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: color,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: `${color}`, fontWeight: 600 }}
          >
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

function PriorityHeader({
  title,
  color,
  count,
}: {
  title: string;
  color: string;
  count: number;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
      <Chip
        label={title}
        sx={{ bgcolor: `${color}1A`, color: color, fontWeight: 700 }}
      />
      <Typography variant="body2" color="text.secondary">
        ({count})
      </Typography>
    </Stack>
  );
}

function DetailRow({
  icon,
  text,
}: {
  icon: React.ReactElement;
  text?: string | number | null;
}) {
  if (text === undefined || text === null || text === "") return null;
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ color: "text.secondary" }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  );
}

function CallItemCard({ item }: { item: CallingListItem }) {
  const color =
    item.priority === "High"
      ? "#d32f2f"
      : item.priority === "Medium"
        ? "#ed6c02"
        : "#1976d2";
  const telHref = item.mobile ? `tel:${item.mobile}` : undefined;
  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: `${color}33`,
        "&:hover": { borderColor: color },
        transition: "border-color .2s",
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ mb: 0.5 }}
            >
              <PersonIcon sx={{ fontSize: 18, color }} />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name || "Unknown"}
              </Typography>
              {item.reason ? (
                <Chip size="small" label={item.reason} sx={{ height: 20 }} />
              ) : null}
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              flexWrap="wrap"
            >
              <DetailRow
                icon={<PlaceIcon sx={{ fontSize: 16 }} />}
                text={
                  item.village
                    ? `${item.village}${item.taluka ? `, ${item.taluka}` : ""}`
                    : undefined
                }
              />
              <DetailRow
                icon={<PhoneIcon sx={{ fontSize: 16 }} />}
                text={item.mobile}
              />
              {typeof item.outstanding_balance === "number" &&
              item.outstanding_balance > 0 ? (
                <DetailRow
                  icon={<PaymentsIcon sx={{ fontSize: 16 }} />}
                  text={`Due ₹${item.outstanding_balance.toFixed(2)}`}
                />
              ) : null}
              {item.days_since_purchase !== undefined &&
              item.days_since_purchase !== null ? (
                <DetailRow
                  icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                  text={`${item.days_since_purchase} days inactive`}
                />
              ) : null}
              {item.last_purchase_date ? (
                <DetailRow
                  icon={<EventIcon sx={{ fontSize: 16 }} />}
                  text={`Last: ${item.last_purchase_date}`}
                />
              ) : null}
              {item.demo_date ? (
                <DetailRow
                  icon={<EventIcon sx={{ fontSize: 16 }} />}
                  text={`Demo: ${item.demo_date}${item.follow_up_date ? `, Follow-up: ${item.follow_up_date}` : ""}`}
                />
              ) : null}
              {item.product_name ? (
                <DetailRow
                  icon={<InsightsIcon sx={{ fontSize: 16 }} />}
                  text={item.product_name}
                />
              ) : null}
            </Stack>
          </Box>
          <Stack alignItems="flex-end" spacing={1} sx={{ minWidth: 56 }}>
            <Chip
              size="small"
              label={item.priority || "Low"}
              sx={{ bgcolor: `${color}1A`, color }}
            />

            {telHref ? (
              <Tooltip title={`Call ${item.mobile}`}>
                <IconButton component="a" href={telHref} color="primary">
                  <PhoneIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="No phone">
                <span>
                  <IconButton disabled color="primary">
                    <PhoneIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function CallingList() {
  const [inactiveDays, setInactiveDays] = useState<number>(30);
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CallingListResponse | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await automationAPI.getCallingList({
        inactive_days: inactiveDays,
        limit,
      });
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load calling list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const high = data?.calling_priorities?.high_priority || [];
  const med = data?.calling_priorities?.medium_priority || [];
  const low = data?.calling_priorities?.low_priority || [];
  const empty =
    !loading && !error && high.length + med.length + low.length === 0;

  const summary = useMemo(
    () => ({
      inactive: data?.summary?.total_inactive_customers || 0,
      followups: data?.summary?.total_pending_demos || 0,
      dues: data?.summary?.total_outstanding_payments || 0,
      total: data?.summary?.total_calls_suggested || 0,
    }),
    [data],
  );

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <WarningIcon color="warning" /> Calling List
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <TextField
            type="number"
            size="small"
            label="Inactive Days"
            value={inactiveDays}
            onChange={(e) =>
              setInactiveDays(Math.max(0, Number(e.target.value || 0)))
            }
            sx={{ width: 160 }}
          />
          <TextField
            type="number"
            size="small"
            label="Limit"
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Number(e.target.value || 1)))}
            sx={{ width: 120 }}
          />
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md="auto">
          <Metric
            label="Suggested Calls"
            value={summary.total}
            color="#1976d2"
            icon={<PhoneIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md="auto">
          <Metric
            label="Inactive Customers"
            value={summary.inactive}
            color="#9c27b0"
            icon={<ScheduleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md="auto">
          <Metric
            label="Demo Follow-ups"
            value={summary.followups}
            color="#2e7d32"
            icon={<EventIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md="auto">
          <Metric
            label="Outstanding Dues"
            value={summary.dues}
            color="#d32f2f"
            icon={<PaymentsIcon />}
          />
        </Grid>
      </Grid>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : empty ? (
        <Alert severity="info">No suggestions found</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <PriorityHeader
              title="High Priority"
              color="#d32f2f"
              count={high.length}
            />
            <Stack spacing={1.5}>
              {high.map((item, idx) => (
                <CallItemCard
                  key={`high-${idx}-${item.customer_id ?? ""}`}
                  item={item}
                />
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <PriorityHeader
              title="Medium Priority"
              color="#ed6c02"
              count={med.length}
            />
            <Stack spacing={1.5}>
              {med.map((item, idx) => (
                <CallItemCard
                  key={`med-${idx}-${item.customer_id ?? ""}`}
                  item={item}
                />
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          <Grid item xs={12}>
            <PriorityHeader
              title="Low Priority"
              color="#1976d2"
              count={low.length}
            />
            <Stack spacing={1.5}>
              {low.map((item, idx) => (
                <CallItemCard
                  key={`low-${idx}-${item.customer_id ?? ""}`}
                  item={item}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
