import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Avatar,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://pc-sales-8phu.onrender.com";

interface ActivityLog {
  id: number;
  user_email: string;
  user_name?: string;
  action_type: string;
  action_description: string;
  entity_type?: string;
  entity_id?: number;
  entity_name?: string;
  metadata?: any;
  created_at: string;
}

const actionTypeColors: Record<
  string,
  "success" | "info" | "error" | "warning" | "default"
> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
  IMPORT: "warning",
  EXPORT: "info",
  LOGIN: "default",
  LOGOUT: "default",
  VIEW: "default",
};

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUserEmail, setFilterUserEmail] = useState("");
  const [filterActionType, setFilterActionType] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Check if user is admin
  useEffect(() => {
    if (user && user.email !== "admin@gmail.com") {
      setError("Access denied. Admin privileges required.");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }
  }, [user, navigate]);

  // Load activity logs
  const loadActivities = async () => {
    if (!user || user.email !== "admin@gmail.com") return;

    try {
      setLoading(true);
      setError(null);

      const params: any = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      };

      if (filterUserEmail) params.user_email = filterUserEmail;
      if (filterActionType) params.action_type = filterActionType;

      const response = await axios.get(
        `${API_BASE_URL}/api/admin/activity-logs`,
        {
          params,
          headers: {
            "x-user-email": user.email,
          },
        },
      );

      setActivities(response.data.data || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      console.error("Error loading activities:", err);
      setError(err.response?.data?.detail || "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email === "admin@gmail.com") {
      loadActivities();
    }
  }, [user, page, rowsPerPage, filterUserEmail, filterActionType]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredActivities = activities.filter((activity) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      activity.user_email?.toLowerCase().includes(search) ||
      activity.action_description?.toLowerCase().includes(search) ||
      activity.entity_name?.toLowerCase().includes(search)
    );
  });

  // Get unique values for filters
  const uniqueUsers = Array.from(
    new Set(activities.map((a) => a.user_email).filter(Boolean)),
  );
  const uniqueActionTypes = Array.from(
    new Set(activities.map((a) => a.action_type).filter(Boolean)),
  );

  if (!user || user.email !== "admin@gmail.com") {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Alert severity="error">
          Access denied. This page is only accessible to admin@gmail.com
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Admin Activity Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor all user activities and actions in the system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="Filter by User"
                value={filterUserEmail}
                onChange={(e) => setFilterUserEmail(e.target.value)}
              >
                <MenuItem value="">All Users</MenuItem>
                {uniqueUsers.map((email) => (
                  <MenuItem key={email} value={email}>
                    {email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                select
                size="small"
                label="Filter by Action"
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                {uniqueActionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Tooltip title="Refresh">
                  <IconButton onClick={loadActivities} color="primary">
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            All Activities ({total})
          </Typography>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Description
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Entity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        Date & Time
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No activity logs found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => (
                        <TableRow
                          key={activity.id}
                          hover
                          sx={{
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  bgcolor: "primary.main",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {activity.user_email.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 500 }}
                                >
                                  {activity.user_email}
                                </Typography>
                                {activity.user_name && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {activity.user_name}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={activity.action_type}
                              size="small"
                              color={
                                actionTypeColors[activity.action_type] ||
                                "default"
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {activity.action_description}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {activity.entity_type && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    px: 1,
                                    py: 0.5,
                                    bgcolor: "background.default",
                                    borderRadius: 1,
                                    display: "inline-block",
                                  }}
                                >
                                  {activity.entity_type}
                                </Typography>
                                {activity.entity_name && (
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {activity.entity_name}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(activity.created_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
