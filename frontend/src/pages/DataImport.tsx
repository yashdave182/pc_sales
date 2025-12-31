import { useState } from "react";
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
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { fileAPI } from "../services/api";
import { useTranslation } from "../hooks/useTranslation";

export default function DataImport() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError(t("import.invalidFileType"));
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError(t("import.selectFileError"));
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

      // Create FormData and append the file
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fileAPI.upload(formData);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Show success message with import details
      const successMsg =
        response.message ||
        t("import.fileUploaded") +
          `: "${response.filename || selectedFile.name}"`;
      setSuccess(successMsg);
      setSelectedFile(null);

      // Reset after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        setUploadProgress(0);
      }, 3000);
    } catch (err: any) {
      // Extract error message from backend response
      let errorMessage = t("import.uploadError");

      if (err?.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <CloudUploadIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("import.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("import.subtitle")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {/* Upload Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "primary.main",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              bgcolor: "background.default",
              cursor: "pointer",
              transition: "all 0.3s",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <CloudUploadIcon
              sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
            />
            <Typography variant="h6" sx={{ mb: 1 }}>
              {selectedFile ? selectedFile.name : t("import.clickToSelect")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("import.supportedFormats")}
            </Typography>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </Box>

          {selectedFile && (
            <Box sx={{ mt: 3, display: "flex", gap: 2, alignItems: "center" }}>
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
                {t("import.upload")}
              </Button>
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {t("import.uploading")} {uploadProgress}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            {t("import.instructions")}
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t("import.excelFormat")}
                secondary={t("import.excelFormatDesc")}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t("import.dataStructure")}
                secondary={t("import.dataStructureDesc")}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t("import.fileSize")}
                secondary={t("import.fileSizeDesc")}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary={t("import.processing")}
                secondary={t("import.processingDesc")}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Required Excel Format */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📋 Required Excel Column Format
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your Excel file must contain one of these formats. The system will
            auto-detect the type based on columns.
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              🧑‍🤝‍🧑 Customers Excel
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Required columns: <strong>name, mobile, village, taluka</strong>
            </Typography>
            <Box
              component="code"
              sx={{
                display: "block",
                p: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            >
              name | mobile | village | taluka | district
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              🏪 Distributors Excel
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Required columns:{" "}
              <strong>
                village, taluka, district, mantri name, mantri mobile, sabhasad,
                contact in group
              </strong>
            </Typography>
            <Box
              component="code"
              sx={{
                display: "block",
                p: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            >
              name | village | taluka | district | mantri name | mantri mobile |
              sabhasad | contact in group
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              💰 Sales Excel (Multi-Sheet)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Must have <strong>multiple sheets</strong>. Required columns:{" "}
              <strong>name, packing, qtn, rate, amt, dispatch date</strong>
            </Typography>
            <Box
              component="code"
              sx={{
                display: "block",
                p: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.85rem",
              }}
            >
              inv no | name | packing | qtn | rate | amt | dispatch date
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
