import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { fileAPI } from '../services/api';

export default function DataImport() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select an Excel file (.xlsx or .xls)');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fileAPI.upload(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(`File "${response.filename}" uploaded successfully!`);
      setSelectedFile(null);

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        setUploadProgress(0);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <CloudUploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Data Import
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload Excel files to import data into the system
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

      {/* Upload Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: 'background.default',
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {selectedFile ? selectedFile.name : 'Click to select file or drag and drop'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: .xlsx, .xls
            </Typography>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Box>

          {selectedFile && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                icon={<FileIcon />}
                label={`${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                onDelete={() => setSelectedFile(null)}
                color="primary"
              />
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploading}
                startIcon={<CloudUploadIcon />}
              >
                Upload
              </Button>
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Uploading... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Upload Instructions
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Excel Format"
                secondary="Ensure your Excel file contains proper column headers"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Data Structure"
                secondary="The system will automatically detect sales, customer, and distributor data"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="File Size"
                secondary="Maximum file size is 10MB"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Processing"
                secondary="After upload, data will be processed and imported automatically"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}
