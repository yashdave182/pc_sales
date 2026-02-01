
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
  Snackbar,
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
  Send as SendIcon,
} from "@mui/icons-material";
import { ListSkeleton } from "../components/Skeletons";
import { automationAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

type CallingListItem = {
  customer_id?: number;
  name?: string;
  mobile?: string;
  village?: string;
  priority?: "High" | "Medium" | "Low";
  reason?: string;
  outstanding_balance?: number;
  days_since_purchase?: number;
  status?: string;
  notes?: string;
  [key: string]: any;
};

type AssignmentsResponse = {
  assignments: CallingListItem[];
  summary: {
    total: number;
    pending: number;
  };
  error?: string;
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
        bgcolor: item.status === "Pending" ? "background.paper" : "#f5f5f5"
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
                text={item.village}
              />
              <DetailRow
                icon={<PhoneIcon sx={{ fontSize: 16 }} />}
                text={item.mobile}
              />
              {item.outstanding_balance ? (
                <DetailRow
                  icon={<PaymentsIcon sx={{ fontSize: 16 }} />}
                  text={`Due ₹${item.outstanding_balance}`}
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
            {item.status !== "Pending" && (
              <Chip size="small" label={item.status} color="success" variant="outlined" />
            )}

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
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AssignmentsResponse | null>(null);
  const [distributing, setDistributing] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: "success" | "error" } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await automationAPI.getMyAssignments();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load your assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleDistribute = async () => {
    if (!window.confirm("Are you sure you want to trigger daily distribution now? (This is usually automated)")) return;
    try {
      setDistributing(true);
      const res = await automationAPI.runDistribution();
      setToast({ msg: `Distribution Complete: ${res.total_calls} calls assigned to ${res.staff_count} staff.`, type: "success" });
      load(); // reload to see if I got any
    } catch (e: any) {
      setToast({ msg: `Distribution Failed: ${e.message}`, type: "error" });
    } finally {
      setDistributing(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assignments = data?.assignments || [];
  const high = assignments.filter(x => x.priority === "High");
  const med = assignments.filter(x => x.priority === "Medium");
  const low = assignments.filter(x => x.priority === "Low");

  const empty = !loading && !error && assignments.length === 0;

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
          <WarningIcon color="warning" /> My Calling List (Today)
        </Typography>
        <Stack direction="row" spacing={1.5}>
          {user?.email === "admin@gmail.com" && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SendIcon />}
              onClick={handleDistribute}
              disabled={distributing}
              title="Admin Tool: Manually Trigger Distribution"
            >
              {distributing ? "Distributing..." : "Run Distribution"}
            </Button>
          )}
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
            label="My Total Tasks"
            value={data?.summary?.total || 0}
            color="#1976d2"
            icon={<PhoneIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md="auto">
          <Metric
            label="Pending"
            value={data?.summary?.pending || 0}
            color="#d32f2f"
            icon={<ScheduleIcon />}
          />
        </Grid>
      </Grid>

      {loading ? (
        <ListSkeleton count={5} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : empty ? (
        <Alert severity="info">
          No calls assigned to you for today yet.
          (Admins: Click 'Run Distribution' to assign tasks)
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {high.length > 0 && (
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
          )}

          {high.length > 0 && med.length > 0 && (
            <Grid item xs={12}><Divider /></Grid>
          )}

          {med.length > 0 && (
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
          )}

          {(high.length > 0 || med.length > 0) && low.length > 0 && (
            <Grid item xs={12}><Divider /></Grid>
          )}

          {low.length > 0 && (
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
          )}
        </Grid>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast?.msg}
      />
    </Box>
  );
}
