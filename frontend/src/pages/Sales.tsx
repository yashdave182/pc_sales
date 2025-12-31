import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { salesAPI, customerAPI, productAPI } from "../services/api";
import type { Sale, Customer, Product, SaleItem } from "../types";

import { useTranslation } from "../hooks/useTranslation";

export default function Sales() {
  const { t, tf } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: 0,
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [items, setItems] = useState<Partial<SaleItem>[]>([
    { product_id: 0, quantity: 1, rate: 0, amount: 0 },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesData, customersData, productsData] = await Promise.all([
        salesAPI.getAll({ limit: 1000 }),
        customerAPI.getAll({ limit: 1000 }),
        productAPI.getAll(),
      ]);
      setSales(salesData);
      setCustomers(customersData.data || []);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("messages.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      customer_id: 0,
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setItems([{ product_id: 0, quantity: 1, rate: 0, amount: 0 }]);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: 0, quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount
    if (field === "quantity" || field === "rate") {
      const item = newItems[index];
      item.amount = (item.quantity || 0) * (item.rate || 0);
    }

    // Auto-fill rate from product
    if (field === "product_id") {
      const product = products.find((p) => p.product_id === value);
      if (product && product.standard_rate) {
        newItems[index].rate = product.standard_rate;
        newItems[index].amount =
          (newItems[index].quantity || 0) * product.standard_rate;
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.customer_id) {
        setError(t("sales.selectCustomer", "Please select a customer"));
        return;
      }

      if (items.length === 0 || !items[0].product_id) {
        setError(t("sales.addAtLeastOneItem", "Please add at least one item"));
        return;
      }

      const saleData = {
        customer_id: formData.customer_id,
        sale_date: formData.sale_date,
        items: items as SaleItem[],
        notes: formData.notes,
      };

      await salesAPI.create(saleData);
      handleCloseDialog();
      loadData();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("sales.createError", "Failed to create sale"),
      );
    }
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const columns: GridColDef[] = [
    {
      field: "invoice_no",
      headerName: tf("invoice_no"),
      width: 140,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="primary" />
      ),
    },
    {
      field: "customer_name",
      headerName: t("customers.customerName"),
      flex: 1,
      minWidth: 200,
    },
    {
      field: "village",
      headerName: tf("village"),
      width: 150,
    },
    {
      field: "sale_date",
      headerName: tf("date"),
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: "total_amount",
      headerName: tf("amount"),
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600}>
          ₹{params.value?.toLocaleString()}
        </Typography>
      ),
    },
    {
      field: "payment_status",
      headerName: t("dashboard.paymentStatus"),
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === "Paid"
              ? "success"
              : params.value === "Partial"
                ? "warning"
                : "error"
          }
        />
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          <ShoppingCartIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          {t("sales.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("sales.subtitle", "Create and manage sales transactions")}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              size="large"
            >
              {t("sales.addSale")}
            </Button>
            <IconButton onClick={loadData} color="primary">
              <RefreshIcon />
            </IconButton>
            <Box sx={{ ml: "auto", display: "flex", gap: 2 }}>
              <Chip
                label={`${t("dashboard.totalSales")}: ${sales.length}`}
                color="primary"
              />
              <Chip
                label={`${t("dashboard.amount")}: ₹${sales.reduce((sum, s) => sum + s.total_amount, 0).toLocaleString()}`}
                color="success"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: "100%" }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={sales}
                columns={columns}
                getRowId={(row) => row.sale_id}
                pageSizeOptions={[10, 25, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                disableRowSelectionOnClick
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Create Sale Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptIcon />
            {t("sales.addSale")}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label={`${t("customers.customerName")} *`}
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer_id: Number(e.target.value),
                  })
                }
              >
                <MenuItem value={0}>
                  {t("sales.selectCustomer", "Select Customer")}
                </MenuItem>
                {customers.map((customer) => (
                  <MenuItem
                    key={customer.customer_id}
                    value={customer.customer_id}
                  >
                    {customer.name} - {customer.village}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label={t("sales.date", "Sale Date")}
                value={formData.sale_date}
                onChange={(e) =>
                  setFormData({ ...formData, sale_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography variant="h6">
                  {t("sales.itemsTitle", "Sale Items")}
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddItem}
                  size="small"
                >
                  {t("sales.addItem", "Add Item")}
                </Button>
              </Box>
            </Grid>
            {items.map((item, index) => (
              <Grid item xs={12} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={5}>
                        <TextField
                          fullWidth
                          select
                          size="small"
                          label={t("sales.product", "Product")}
                          value={item.product_id || 0}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "product_id",
                              Number(e.target.value),
                            )
                          }
                        >
                          <MenuItem value={0}>
                            {t("sales.selectProduct", "Select Product")}
                          </MenuItem>
                          {products.map((product) => (
                            <MenuItem
                              key={product.product_id}
                              value={product.product_id}
                            >
                              {product.product_name} - ₹{product.standard_rate}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label={tf("quantity")}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label={t("sales.rate", "Rate")}
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "rate",
                              Number(e.target.value),
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <TextField
                          fullWidth
                          size="small"
                          label={tf("amount")}
                          value={item.amount || 0}
                          InputProps={{
                            readOnly: true,
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveItem(index)}
                          disabled={items.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Typography variant="h6">
                  {t("dashboard.amount")}: ₹{getTotalAmount().toLocaleString()}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={tf("notes")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t("common.cancel")}</Button>
          <Button onClick={handleSubmit} variant="contained">
            {t("sales.addSale")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
