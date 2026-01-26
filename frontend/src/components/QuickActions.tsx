import { useState } from 'react';
import {
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  ShoppingCart as ShoppingCartIcon,
  Science as ScienceIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  onQuickSearch?: (searchTerm: string) => void;
}

export default function QuickActions({ onQuickSearch }: QuickActionsProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const actions = [
    {
      icon: <SearchIcon />,
      name: 'Quick Search',
      onClick: () => {
        setSearchDialogOpen(true);
        setOpen(false);
      },
      color: '#3b82f6',
    },
    {
      icon: <PersonAddIcon />,
      name: 'Add Customer',
      onClick: () => {
        navigate('/customers');
        setOpen(false);
      },
      color: '#10b981',
    },
    {
      icon: <ShoppingCartIcon />,
      name: 'New Sale',
      onClick: () => {
        navigate('/sales');
        setOpen(false);
      },
      color: '#f59e0b',
    },
    {
      icon: <ScienceIcon />,
      name: 'Schedule Demo',
      onClick: () => {
        navigate('/demos');
        setOpen(false);
      },
      color: '#7c3aed',
    },

  ];

  const handleSearch = () => {
    if (searchTerm.trim()) {
      if (onQuickSearch) {
        onQuickSearch(searchTerm);
      }
      // You can also navigate to a search results page
      // navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
    setSearchDialogOpen(false);
    setSearchTerm('');
  };

  return (
    <>
      <SpeedDial
        ariaLabel="Quick actions"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          '& .MuiSpeedDial-fab': {
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          },
        }}
        icon={<SpeedDialIcon openIcon={<CloseIcon />} />}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        open={open}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={action.onClick}
            sx={{
              '& .MuiSpeedDialAction-fab': {
                bgcolor: action.color,
                color: 'white',
                '&:hover': {
                  bgcolor: action.color,
                  opacity: 0.9,
                },
              },
            }}
          />
        ))}
      </SpeedDial>

      {/* Quick Search Dialog */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Quick Search
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              autoFocus
              label="Search by name, mobile, or invoice"
              placeholder="Enter customer name, mobile number, or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Tooltip title="Search by mobile number">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PhoneIcon />}
                  onClick={() => {
                    // Pre-fill with mobile number format
                    setSearchTerm('+91 ');
                  }}
                >
                  Mobile Search
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
