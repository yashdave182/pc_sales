import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { salesAPI, customerAPI, productAPI } from "../services/api";
import type { Sale, Customer, Product, SaleItem } from "../types";

import { useTranslation } from "../hooks/useTranslation";

export default function Sales() {
  const { t, tf } = useTranslation();
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_no: "",
    sale_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    mobile: "",
    village: "",
    taluka: "",
    district: "",
    adhar_no: "",
    status: "Active",
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
      console.log("Loading sales data...");
      const [salesData, customersData, productsData] = await Promise.all([
        salesAPI.getAll({ limit: 1000 }),
        customerAPI.getAll({ limit: 1000 }),
        productAPI.getAll(),
      ]);
      console.log("Sales loaded:", salesData);
      console.log("Customers loaded:", customersData);
      console.log("Products loaded:", productsData);
      setSales(salesData);
      setCustomers(customersData.data || []);
      setProducts(productsData);
    } catch (err: any) {
      console.error("Error loading sales data:", err);
      const errorMessage =
        err?.response?.data?.detail || err?.message || t("messages.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      customer_id: 0,
      invoice_no: "",
      sale_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setNewCustomerData({
      name: "",
      mobile: "",
      village: "",
      taluka: "",
      district: "",
      adhar_no: "",
      status: "Active",
    });
    setCustomerMode("existing");
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
      let customerId = formData.customer_id;

      // If new customer mode, create customer first
      if (customerMode === "new") {
        // Validate new customer data
        if (!newCustomerData.name || !newCustomerData.mobile) {
          setError(
            t(
              "sales.customerNameMobileRequired",
              "Customer name and mobile are required",
            ),
          );
          return;
        }

        // Create new customer
        try {
          // CHECK FOR DUPLICATE CUSTOMER FIRST
          // Check if customer with same name+village+mobile exists
          const existingCustomer = customers.find(
            c =>
              c.mobile === newCustomerData.mobile &&
              c.name.toLowerCase().trim() === newCustomerData.name.toLowerCase().trim() &&
              (c.village || "").toLowerCase().trim() === (newCustomerData.village || "").toLowerCase().trim()
          );

          if (existingCustomer) {
            // Use existing customer
            customerId = existingCustomer.customer_id || 0;
            // Notify user
            console.log("Duplicate customer found, using existing: " + existingCustomer.name);
            if (!window.confirm(`Customer "${existingCustomer.name}" from ${existingCustomer.village || 'N/A'} with mobile ${newCustomerData.mobile} already exists. Use existing customer?`)) {
              return;
            }
          } else {
            const newCustomer = await customerAPI.create(
              newCustomerData as Customer,
            );
            customerId = newCustomer.customer_id;
            // Reload customers list
            const customersData = await customerAPI.getAll({ limit: 1000 });
            setCustomers(customersData.data || []);
          }
        } catch (err: any) {
          console.error("Error creating customer:", err);
          const errorMessage =
            err?.response?.data?.detail ||
            err?.message ||
            t("customers.createError", "Failed to create customer");
          setError(errorMessage);
          return;
        }
      } else {
        // Validate existing customer selection
        if (!customerId || customerId === 0) {
          setError(t("sales.selectCustomer", "Please select a customer"));
          return;
        }
      }

      // Validate items
      if (items.length === 0) {
        setError(t("sales.addAtLeastOneItem", "Please add at least one item"));
        return;
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.product_id || item.product_id === 0) {
          setError(`Item ${i + 1}: Please select a product`);
          return;
        }
        if (!item.quantity || item.quantity <= 0) {
          setError(`Item ${i + 1}: Quantity must be greater than 0`);
          return;
        }
        if (!item.rate || item.rate <= 0) {
          setError(`Item ${i + 1}: Rate must be greater than 0`);
          return;
        }
      }

      const saleData = {
        customer_id: customerId,
        invoice_no: formData.invoice_no || undefined,
        sale_date: formData.sale_date,
        items: items.map((item) => ({
          product_id: item.product_id!,
          quantity: item.quantity!,
          rate: item.rate!,
          amount: item.amount!,
        })),
        notes: formData.notes || undefined,
      };

      console.log("Creating sale:", saleData);
      const response = await salesAPI.create(saleData);
      console.log("Sale created:", response);

      handleCloseDialog();
      loadData();
      setError(null);
    } catch (err: any) {
      console.error("Error creating sale:", err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.message ||
        t("sales.createError", "Failed to create sale");
      setError(errorMessage);
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
      renderCell: (params) => {
        const isPending =
          params.value === "Pending" || params.value === "Partial";
        return (
          <Tooltip
            title={
              isPending
                ? t("sales.clickToAddPayment", "Click to add payment")
                : ""
            }
          >
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
              onClick={
                isPending
                  ? () => {
                    navigate("/payments", {
                      state: { saleId: params.row.sale_id },
                    });
                  }
                  : undefined
              }
              sx={{
                cursor: isPending ? "pointer" : "default",
                "&:hover": isPending
                  ? {
                    opacity: 0.8,
                    transform: "scale(1.05)",
                  }
                  : {},
                transition: "all 0.2s",
              }}
            />
          </Tooltip>
        );
      },
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
            {/* Customer Mode Toggle */}
            <Grid item xs={12}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {t("sales.customerSelection", "Customer:")}
                </Typography>
                <ToggleButtonGroup
                  value={customerMode}
                  exclusive
                  onChange={(e, newMode) => {
                    if (newMode !== null) {
                      setCustomerMode(newMode);
                    }
                  }}
                  size="small"
                  color="primary"
                >
                  <ToggleButton value="existing">
                    <PeopleIcon sx={{ mr: 1, fontSize: 18 }} />
                    {t("sales.existingCustomer", "Existing Customer")}
                  </ToggleButton>
                  <ToggleButton value="new">
                    <PersonAddIcon sx={{ mr: 1, fontSize: 18 }} />
                    {t("sales.newCustomer", "New Customer")}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Divider />
            </Grid>

            {/* Existing Customer Selection */}
            {customerMode === "existing" && (
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
            )}

            {/* New Customer Form */}
            {customerMode === "new" && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`${t("customers.customerName")} *`}
                    value={newCustomerData.name}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        name: e.target.value,
                      })
                    }
                    placeholder={t(
                      "sales.enterCustomerName",
                      "Enter customer name",
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`${tf("mobile")} *`}
                    value={newCustomerData.mobile}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        mobile: e.target.value,
                      })
                    }
                    placeholder="9876543210"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">+91</InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={tf("village")}
                    value={newCustomerData.village}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        village: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={tf("taluka")}
                    value={newCustomerData.taluka}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        taluka: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={tf("district")}
                    value={newCustomerData.district}
                    onChange={(e) =>
                      setNewCustomerData({
                        ...newCustomerData,
                        district: e.target.value,
                      })
                    }
                  />
                </Grid>
              </>
            )}

            {/* Sale Date */}
            <Grid item xs={12} sm={customerMode === "new" ? 12 : 6}>
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
            {/* Aadhar No for New Customer */}
            {customerMode === "new" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Adhar No"
                  value={newCustomerData.adhar_no || ""}
                  onChange={(e) =>
                    setNewCustomerData({
                      ...newCustomerData,
                      adhar_no: e.target.value,
                    })
                  }
                  placeholder="12-digit Aadhar"
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={tf("invoice_no")}
                value={formData.invoice_no}
                onChange={(e) =>
                  setFormData({ ...formData, invoice_no: e.target.value })
                }
                placeholder={t("sales.invoiceNoPlaceholder", "Leave empty for auto-generation")}
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
    </Box >
  );
}
