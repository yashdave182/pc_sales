import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  CircularProgress,
  Alert,
  IconButton,
  Modal,
  Fade,
  Backdrop,
  useTheme,
  Tooltip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { adminAPI } from "../services/api";
import { Refresh as RefreshIcon, CalendarMonth as CalendarIcon, Close as CloseIcon } from "@mui/icons-material";

// Helper info for Github-style calendar map
const getLevelColor = (hours: number, theme: any) => {
  if (hours === 0) return "#ffeb3b"; // Wait, red requested:
  // 0 hrs → red
  if (hours === 0) return theme.palette.error.main || "#f44336";
  // 0-2 hrs → light green
  if (hours <= 2) return "#c8e6c9";
  // 2-4 hrs → medium green
  if (hours <= 4) return "#81c784";
  // 4-6 hrs → dark green
  if (hours <= 6) return "#4caf50";
  // 6+ hrs → darkest green
  return "#2e7d32";
};

const formatSecondsToTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
};

// Internal Modal block
const SessionCalendarModal = ({ open, onClose, userEmail }: { open: boolean, onClose: () => void, userEmail: string | null }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userEmail) {
      loadHistory();
    }
  }, [open, userEmail]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getUserSessionHistory(userEmail!);
      setHistory(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const getDaysArray = (start: Date, end: Date) => {
    const arr = [];
    for(let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt));
    }
    return arr;
  };

  // Build a 90 day calendar
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 90);
  
  const days = getDaysArray(startDate, today);

  const historyMap = new Map();
  history.forEach(item => {
    historyMap.set(item.session_date, item.total_seconds);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <Box sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", md: 800 },
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          outline: "none",
        }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box>
              <Typography variant="h6">{t("admin.calendarTitle", "Session Calendar")}</Typography>
              <Typography variant="body2" color="text.secondary">{userEmail}</Typography>
            </Box>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>Last 90 Days Activity</Typography>
              <Box sx={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(13, 1fr)", 
                gap: 0.5, 
                mb: 3, 
                overflowX: "auto",
                pb: 1
              }}>
                {days.map((date, i) => {
                  const dateStr = date.toISOString().split("T")[0];
                  const seconds = historyMap.get(dateStr) || 0;
                  const hours = seconds / 3600;
                  const color = getLevelColor(hours, theme);

                  return (
                    <Tooltip key={i} title={`${dateStr}: ${formatSecondsToTime(seconds)}`}>
                      <Box
                        sx={{
                          width: { xs: 12, sm: 16 },
                          height: { xs: 12, sm: 16 },
                          bgcolor: color,
                          borderRadius: "2px",
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end", flexWrap: "wrap", mt: 4 }}>
                <Typography variant="caption" color="text.secondary">Less</Typography>
                <Tooltip title="0 hrs"><Box sx={{ width: 12, height: 12, bgcolor: getLevelColor(0, theme), borderRadius: "2px" }} /></Tooltip>
                <Tooltip title="0-2 hrs"><Box sx={{ width: 12, height: 12, bgcolor: getLevelColor(1, theme), borderRadius: "2px" }} /></Tooltip>
                <Tooltip title="2-4 hrs"><Box sx={{ width: 12, height: 12, bgcolor: getLevelColor(3, theme), borderRadius: "2px" }} /></Tooltip>
                <Tooltip title="4-6 hrs"><Box sx={{ width: 12, height: 12, bgcolor: getLevelColor(5, theme), borderRadius: "2px" }} /></Tooltip>
                <Tooltip title="6+ hrs"><Box sx={{ width: 12, height: 12, bgcolor: getLevelColor(7, theme), borderRadius: "2px" }} /></Tooltip>
                <Typography variant="caption" color="text.secondary">More</Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Fade>
    </Modal>
  );
};


export const AdminSessionsView = () => {
  const { t } = useTranslation();
  
  // Format dates in YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [selectedDate]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getUserSessionsForDate(selectedDate);
      if (data?.error) {
        setError(data.error);
        setSessions([]);
      } else {
        setSessions(data.data || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCalendar = (email: string) => {
    setSelectedUser(email);
    setModalOpen(true);
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {t("admin.userSessions", "User Sessions")}
              </Typography>
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                inputProps={{ max: new Date().toISOString().split("T")[0] }}
              />
            </Box>
            <IconButton onClick={loadSessions} color="primary" disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : sessions.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("admin.noSessionData", "No session data found")} for {selectedDate}
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t("admin.user", "User")}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t("admin.sessionTime", "Total Session Time")}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{t("common.action", "Action")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            {session.user_email.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">{session.user_email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatSecondsToTime(session.total_seconds)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t("admin.viewCalendar", "View Activity Calendar")}>
                          <IconButton size="small" color="primary" onClick={() => handleOpenCalendar(session.user_email)}>
                            <CalendarIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <SessionCalendarModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        userEmail={selectedUser} 
      />
    </Box>
  );
};
