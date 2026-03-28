import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
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

import { Theme } from "@mui/material";

// Helper info for calendar color coding - matching the reference design
const getLevelColor = (hours: number) => {
  if (hours === 0) return "#b71c1c"; // Dark red for 0 hours
  if (hours < 2) return "#558b2f"; // Light green
  if (hours < 4) return "#33691e"; // Medium green
  if (hours < 6) return "#2e7d32"; // Darker green
  if (hours < 8) return "#1b5e20"; // Dark green
  return "#0d5016"; // Darkest green for 8+ hours
};

// Format seconds to time display like "0h 0m", "2h 15m", "8h 0m+"
const formatSecondsToTime = (totalSeconds: number, showPlus: boolean = false) => {
  if (totalSeconds === 0) return "0h 0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const suffix = showPlus && h >= 8 ? "+" : "";
  return `${h}h ${m}m${suffix}`;
};

// Get day abbreviation
const getDayAbbr = (date: Date) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
};

// Internal Modal block
const SessionCalendarModal = ({ open, onClose, userEmail }: { open: boolean, onClose: () => void, userEmail: string | null }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (open && userEmail) {
      // Whenever modal opens, reset to current month and fetch history
      setCurrentMonth(new Date());
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

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const historyMap = new Map();
  history.forEach(item => {
    historyMap.set(item.session_date, item.total_seconds);
  });

  // Calendar Generation Logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthName = currentMonth.toLocaleString('default', { month: 'long' });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Create array for all cells in the grid (blanks + actual days)
  const calendarCells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(year, month, d));
  }
  // Fill the rest of the last week row
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

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
          width: { xs: "98%", sm: "95%", md: "90%", lg: 1100 },
          maxWidth: 1200,
          height: 'auto',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 0,
          outline: "none",
          overflow: "hidden",
        }}>
          {/* Header */}
          <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
            <Box>
              <Typography variant="h6">{t("admin.calendarTitle", "Session Calendar")}</Typography>
              <Typography variant="body2" color="text.secondary">{userEmail}</Typography>
            </Box>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>

          {/* Body */}
          <Box sx={{ p: 2, flexGrow: 1 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Box>
                {/* Month Navigation */}
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                  <Button onClick={handlePrevMonth} variant="outlined" size="small" sx={{ minWidth: 40 }}>&lt;</Button>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', width: 220, textAlign: 'center' }}>
                    {monthName} {year}
                  </Typography>
                  <Button onClick={handleNextMonth} variant="outlined" size="small" sx={{ minWidth: 40 }}>&gt;</Button>
                </Box>

                {/* Calendar Grid */}
                <Box sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 0.5,
                  mb: 1
                }}>
                  {/* Days of Week Header */}
                  {weekDays.map(day => (
                    <Box key={day} sx={{
                      textAlign: "center",
                      py: 1,
                      fontWeight: 600,
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
                      borderRadius: 1,
                      fontSize: '0.85rem'
                    }}>
                      {day}
                    </Box>
                  ))}

                  {/* Calendar Cells */}
                  {calendarCells.map((dateObj, idx) => {
                    if (!dateObj) {
                      return (
                        <Box
                          key={`empty-${idx}`}
                          sx={{
                            height: 80,
                            borderRadius: 1,
                            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
                          }}
                        />
                      );
                    }

                    // For timezone safety, format exactly to YYYY-MM-DD local
                    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                    const seconds = historyMap.get(dateStr) || 0;
                    const hours = seconds / 3600;
                    const color = getLevelColor(hours);
                    const dayAbbr = getDayAbbr(dateObj);

                    const isToday = new Date().toDateString() === dateObj.toDateString();

                    return (
                      <Box key={dateStr} sx={{
                        height: 80,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: color,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        border: isToday ? '2px solid' : 'none',
                        borderColor: isToday ? 'primary.light' : 'transparent',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          zIndex: 1,
                          boxShadow: '0 4px 15px rgba(0,0,0,0.25)'
                        }
                      }}>
                        {/* Date Number and Day Abbreviation */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography sx={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: 'white',
                            textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                            lineHeight: 1
                          }}>
                            {dateObj.getDate()}
                          </Typography>
                          <Typography sx={{
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            color: 'rgba(255,255,255,0.85)',
                            textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                          }}>
                            {dayAbbr}
                          </Typography>
                        </Box>

                        {/* Hours Display - Centered */}
                        <Box sx={{
                          flexGrow: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            textShadow: '0px 1px 3px rgba(0,0,0,0.6)',
                            letterSpacing: '0.3px'
                          }}>
                            {formatSecondsToTime(seconds, true)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>

                {/* Legend */}
                <Box sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  mt: 1.5,
                  py: 1,
                  px: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  borderRadius: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(0), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>0 hrs</Typography>
                  </Box>
                  <Box sx={{ width: 1, height: 16, bgcolor: 'divider' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(1), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>&lt;2</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(3), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>2-4</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(5), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>4-6</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(7), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>6-8</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: getLevelColor(9), borderRadius: 0.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>8+</Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
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
