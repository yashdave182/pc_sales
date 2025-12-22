import React, { ReactNode } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  useTheme,
} from '@mui/material';
import { Refresh as RefreshIcon, Error as ErrorIcon } from '@mui/icons-material';

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
      error.message.includes('timeout') ||
      error.message.includes('3000') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Network') ||
      error.message.includes('Failed to fetch');

    return {
      hasError: true,
      error,
      isTimeout,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Check if it's a timeout error
    const isTimeout =
      error.message.includes('timeout') ||
      error.message.includes('3000') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Network') ||
      error.message.includes('Failed to fetch');

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
      return <ErrorDisplay
        error={this.state.error}
        isTimeout={this.state.isTimeout}
        onRefresh={this.handleRefresh}
        onReset={this.handleReset}
      />;
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
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              boxShadow: theme.palette.mode === 'dark' ? 4 : 8,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <CardContent
              sx={{
                textAlign: 'center',
                padding: 4,
                background:
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                    : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
              }}
            >
              {/* Icon */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 3,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(244, 67, 54, 0.15)'
                        : 'rgba(244, 67, 54, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': {
                        opacity: 1,
                      },
                      '50%': {
                        opacity: 0.7,
                      },
                    },
                  }}
                >
                  <ErrorIcon
                    sx={{
                      fontSize: 48,
                      color: '#f44336',
                    }}
                  />
                </Box>
              </Box>

              {/* Title */}
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  marginBottom: 1.5,
                  color:
                    theme.palette.mode === 'dark'
                      ? '#ffffff'
                      : '#1e1e1e',
                }}
              >
                Server Timeout
              </Typography>

              {/* Description */}
              <Typography
                variant="body1"
                sx={{
                  color:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.7)'
                      : 'rgba(0, 0, 0, 0.7)',
                  marginBottom: 2,
                  lineHeight: 1.6,
                }}
              >
                The server is taking longer than expected to respond. This
                usually happens when the server goes to sleep due to inactivity
                on the free tier.
              </Typography>

              {/* Details Box */}
              <Box
                sx={{
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 2,
                  padding: 2,
                  marginBottom: 3,
                  borderLeft: `4px solid #f44336`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.6)'
                        : 'rgba(0, 0, 0, 0.6)',
                    textAlign: 'left',
                  }}
                >
                  <strong>What's happening:</strong>
                  <br />
                  The backend server has gone inactive and needs to be
                  restarted. This is a common behavior on free-tier hosting
                  services.
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'center',
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
                    padding: '12px 32px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.6)',
                    },
                    transition: 'all 0.3s ease',
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
                    padding: '12px 32px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
                >
                  Go Back
                </Button>
              </Box>

              {/* Retry Info */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  marginTop: 3,
                  color:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.5)'
                      : 'rgba(0, 0, 0, 0.5)',
                }}
              >
                The page will attempt to reconnect automatically in a few
                moments. You can also click the Refresh button to try
                immediately.
              </Typography>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Box
            sx={{
              marginTop: 3,
              padding: 2,
              background:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)',
              borderRadius: 2,
              border: `1px solid ${
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.1)'
              }`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.6)'
                    : 'rgba(0, 0, 0, 0.6)',
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

  // Generic error display for non-timeout errors
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: theme.palette.mode === 'dark' ? 4 : 8,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              textAlign: 'center',
              padding: 4,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)',
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 3,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background:
                    theme.palette.mode === 'dark'
                      ? 'rgba(244, 67, 54, 0.15)'
                      : 'rgba(244, 67, 54, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ErrorIcon
                  sx={{
                    fontSize: 48,
                    color: '#f44336',
                  }}
                />
              </Box>
            </Box>

            {/* Title */}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                marginBottom: 1.5,
                color:
                  theme.palette.mode === 'dark' ? '#ffffff' : '#1e1e1e',
              }}
            >
              Something Went Wrong
            </Typography>

            {/* Error Message */}
            <Typography
              variant="body1"
              sx={{
                color:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.7)'
                    : 'rgba(0, 0, 0, 0.7)',
                marginBottom: 2,
              }}
            >
              An unexpected error occurred. Please try refreshing the page.
            </Typography>

            {/* Error Details */}
            {error && (
              <Box
                sx={{
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(0, 0, 0, 0.05)',
                  borderRadius: 2,
                  padding: 2,
                  marginBottom: 3,
                  textAlign: 'left',
                  maxHeight: 150,
                  overflow: 'auto',
                  border: `1px solid ${
                    theme.palette.mode === 'dark'
                      ? 'rgba(244, 67, 54, 0.3)'
                      : 'rgba(244, 67, 54, 0.2)'
                  }`,
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    color: '#f44336',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                  }}
                >
                  {error.toString()}
                </Typography>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'center',
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
                  padding: '12px 32px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.6)',
                  },
                  transition: 'all 0.3s ease',
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
                  padding: '12px 32px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
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
```

Now, update your App.tsx to wrap everything with the ErrorBoundary:

```
sales-management-web\frontend\src\App.tsx
```

<edit_description>
Wrap app with ErrorBoundary component for error handling
</edit_description>

```
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Layout
import Layout from "./components/Layout";
import QuickActions from "./components/QuickActions";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import Demos from "./pages/Demos";
import Distributors from "./pages/Distributors";
import Reports from "./pages/Reports";
import DataImport from "./pages/DataImport";

// Theme
import { createAppTheme } from "./theme/theme";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const theme = createAppTheme(mode);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Router>
            <Layout toggleTheme={toggleTheme} themeMode={mode}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/demos" element={<Demos />} />
                <Route path="/distributors" element={<Distributors />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/import" element={<DataImport />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <QuickActions />
            </Layout>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

Now, create an error interceptor for API calls to catch timeout errors:

```
sales-management-web\frontend\src\services\errorHandler.ts
```

<edit_description>
Create error handler for API timeout detection
</edit_description>

```
import axios from 'axios';

/**
 * Setup global error handler for axios
 * Detects timeout and network errors and throws them to be caught by ErrorBoundary
 */
export const setupErrorHandler = () => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED') {
        const timeoutError = new Error(
          `Request timeout after ${error.config?.timeout || 30000}ms - Server may be down`
        );
        throw timeoutError;
      }

      // Check if it's a connection refused error (server down)
      if (
        error.code === 'ECONNREFUSED' ||
        error.message.includes('ECONNREFUSED')
      ) {
        const serverError = new Error(
          '3000 Server Error: The backend server is not responding. It may have gone to sleep due to inactivity.'
        );
        throw serverError;
      }

      // Check for network errors
      if (error.message === 'Network Error' || !error.response) {
        const networkError = new Error(
          'Network Error: Unable to connect to the server. Please check your connection and try again.'
        );
        throw networkError;
      }

      // Return other errors as-is
      return Promise.reject(error);
    }
  );
};
```

Update your main.tsx to setup the error handler:

```
sales-management-web\frontend\src\main.tsx
```

<edit_description>
Initialize error handler on app startup
</edit_description>

```
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupErrorHandler } from './services/errorHandler'

// Setup global error handler for API calls
setupErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Finally, add a global error handler in your index.html to catch unhandled errors:

```
sales-management-web\frontend\index.html
```

<edit_description>
Add error event listeners for unhandled errors
</edit_description>

```
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sales Management System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Global error handler for unhandled promise rejections and errors
      window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        // Check if it's a timeout or network error
        const errorMessage = event.error?.message || event.message || '';
        const isTimeoutOrNetworkError =
          errorMessage.includes('timeout') ||
          errorMessage.includes('3000') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Network') ||
          errorMessage.includes('Failed to fetch');

        if (isTimeoutOrNetworkError) {
          console.log('Timeout/Network error detected, will be handled by ErrorBoundary');
        }
      });

      window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        const errorMessage = event.reason?.message || event.reason || '';
        const isTimeoutOrNetworkError =
          errorMessage.includes('timeout') ||
          errorMessage.includes('3000') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('Network') ||
          errorMessage.includes('Failed to fetch');

        if (isTimeoutOrNetworkError) {
          // Let the error propagate to be caught by ErrorBoundary
          event.preventDefault();
          throw event.reason;
        }
      });
    </script>
  </body>
</html>
```

This implementation provides:

1. **ErrorBoundary Component**: Catches all React errors and displays a beautiful error UI
2. **Timeout Detection**: Automatically detects 3000 errors and network timeouts
3. **Refresh Button**: Users can click to refresh the page when server is down
4. **Error Interceptor**: Catches API errors and network failures
5. **Global Error Handlers**: Catches unhandled promise rejections
6. **Dark/Light Theme Support**: Error UI respects your app's theme
7. **Responsive Design**: Works on mobile and desktop

The flow is:
- User hits a timeout error
- Error is caught by ErrorBoundary
- Beautiful error UI is displayed
- User clicks "Refresh Page" button
- Page reloads and connects to the (now-restarted) server
