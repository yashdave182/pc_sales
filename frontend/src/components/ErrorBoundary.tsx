import React, { ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isTimeout: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isTimeout: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isTimeout =
      error.message.includes("timeout") ||
      error.message.includes("3000") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Network") ||
      error.message.includes("Failed to fetch");

    return {
      hasError: true,
      error,
      isTimeout,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);

    const isTimeout =
      error.message.includes("timeout") ||
      error.message.includes("3000") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Network") ||
      error.message.includes("Failed to fetch");

    this.setState({ isTimeout });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      isTimeout: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          isTimeout={this.state.isTimeout}
          onRefresh={this.handleRefresh}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorDisplayProps {
  error: Error | null;
  isTimeout: boolean;
  onRefresh: () => void;
  onReset: () => void;
}

function ErrorDisplay({
  error,
  isTimeout,
  onRefresh,
  onReset,
}: ErrorDisplayProps) {
  const theme = useTheme();

  if (isTimeout) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)"
              : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              boxShadow: theme.palette.mode === "dark" ? 4 : 8,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <CardContent
              sx={{
                textAlign: "center",
                padding: 4,
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 3,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background:
                      theme.palette.mode === "dark"
                        ? "rgba(244, 67, 54, 0.15)"
                        : "rgba(244, 67, 54, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%, 100%": {
                        opacity: 1,
                      },
                      "50%": {
                        opacity: 0.7,
                      },
                    },
                  }}
                >
                  <ErrorIcon
                    sx={{
                      fontSize: 48,
                      color: "#f44336",
                    }}
                  />
                </Box>
              </Box>

              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  marginBottom: 1.5,
                  color: theme.palette.mode === "dark" ? "#ffffff" : "#1e1e1e",
                }}
              >
                Server Timeout
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.7)"
                      : "rgba(0, 0, 0, 0.7)",
                  marginBottom: 2,
                  lineHeight: 1.6,
                }}
              >
                The server is taking longer than expected to respond. This
                usually happens when the server goes to sleep due to inactivity
                on the free tier.
              </Typography>

              <Box
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                  borderRadius: 2,
                  padding: 2,
                  marginBottom: 3,
                  borderLeft: "4px solid #f44336",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.6)"
                        : "rgba(0, 0, 0, 0.6)",
                    textAlign: "left",
                  }}
                >
                  <strong>What&apos;s happening:</strong>
                  <br />
                  The backend server has gone inactive and needs to be
                  restarted. This is a common behavior on free-tier hosting
                  services.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", sm: "row" },
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<RefreshIcon />}
                  onClick={onRefresh}
                  sx={{
                    borderRadius: 2,
                    padding: "12px 32px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    textTransform: "none",
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                    "&:hover": {
                      boxShadow: "0 6px 16px rgba(25, 118, 210, 0.6)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Refresh Page
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={onReset}
                  sx={{
                    borderRadius: 2,
                    padding: "12px 32px",
                    fontSize: "1rem",
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  Go Back
                </Button>
              </Box>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  marginTop: 3,
                  color:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.5)"
                      : "rgba(0, 0, 0, 0.5)",
                }}
              >
                The page will attempt to reconnect automatically in a few
                moments. You can also click the Refresh button to try
                immediately.
              </Typography>
            </CardContent>
          </Card>

          <Box
            sx={{
              marginTop: 3,
              padding: 2,
              background:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.05)",
              borderRadius: 2,
              border: `1px solid ${
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)"
              }`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.6)"
                    : "rgba(0, 0, 0, 0.6)",
              }}
            >
              <strong>Tip:</strong> If you encounter this frequently, consider
              upgrading to a paid hosting plan that keeps your server active
              24/7.
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)"
            : "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: theme.palette.mode === "dark" ? 4 : 8,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <CardContent
            sx={{
              textAlign: "center",
              padding: 4,
              background:
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background:
                    theme.palette.mode === "dark"
                      ? "rgba(244, 67, 54, 0.15)"
                      : "rgba(244, 67, 54, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ErrorIcon
                  sx={{
                    fontSize: 48,
                    color: "#f44336",
                  }}
                />
              </Box>
            </Box>

            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                marginBottom: 1.5,
                color: theme.palette.mode === "dark" ? "#ffffff" : "#1e1e1e",
              }}
            >
              Something Went Wrong
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color:
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "rgba(0, 0, 0, 0.7)",
                marginBottom: 2,
              }}
            >
              An unexpected error occurred. Please try refreshing the page.
            </Typography>

            {error && (
              <Box
                sx={{
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                  borderRadius: 2,
                  padding: 2,
                  marginBottom: 3,
                  textAlign: "left",
                  maxHeight: 150,
                  overflow: "auto",
                  border: `1px solid ${
                    theme.palette.mode === "dark"
                      ? "rgba(244, 67, 54, 0.3)"
                      : "rgba(244, 67, 54, 0.2)"
                  }`,
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    color: "#f44336",
                    fontSize: "0.75rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                  }}
                >
                  {error.toString()}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: "center",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<RefreshIcon />}
                onClick={onRefresh}
                sx={{
                  borderRadius: 2,
                  padding: "12px 32px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(25, 118, 210, 0.6)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Refresh Page
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={onReset}
                sx={{
                  borderRadius: 2,
                  padding: "12px 32px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                Go Back
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
