import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { demoAPI, customerAPI, productAPI, distributorAPI } from "../services/api";
import type { Customer, Product, Distributor } from "../types";

interface DemoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DemoDialog({ open, onClose, onSuccess }: DemoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  const [formData, setFormData] = useState({
    customer_id: 0,
    distributor_id: 0,
    demo_date: new Date(),
    demo_time: new Date(),
    product_id: 0,
    quantity_provided: 1,
    follow_up_date: null as Date | null,
    demo_location: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      loadFormData();
    }
  }, [open]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      const [customersData, productsData, distributorsData] = await Promise.all([
        customerAPI.getAll({ limit: 1000 }),
        productAPI.getAll(),
        distributorAPI.getAll({ limit: 1000 }),
      ]);
      setCustomers(Array.isArray(customersData) ? customersData : customersData.data || []);
      setProducts(productsData || []);
      setDistributors(distributorsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.customer_id) {
      setError("Please select a customer");
      return;
    }

    if (!formData.product_id) {
      setError("Please select a product");
      return;
    }

    if (formData.quantity_provided <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    try {
      setLoading(true);

      const demoData = {
        customer_id: formData.customer_id,
        distributor_id: formData.distributor_id || undefined,
        demo_date: formData.demo_date.toISOString().split("T")[0],
        demo_time: formData.demo_time.toTimeString().split(" ")[0].slice(0, 5),
        product_id: formData.product_id,
        quantity_provided: formData.quantity_provided,
        follow_up_date: formData.follow_up_date
          ? formData.follow_up_date.toISOString().split("T")[0]
          : undefined,
        demo_location: formData.demo_location || undefined,
        notes: formData.notes || undefined,
        conversion_status: "Scheduled",
      };

      await demoAPI.create(demoData as any);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule demo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customer_id: 0,
      distributor_id: 0,
      demo_date: new Date(),
      demo_time: new Date(),
      product_id: 0,
      quantity_provided: 1,
      follow_up_date: null,
      demo_location: "",
      notes: "",
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Schedule New Demo</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading && !customers.length ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Customer</InputLabel>
                  <Select
                    value={formData.customer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_id: Number(e.target.value) })
                    }
                    label="Customer"
                  >
                    <MenuItem value={0}>
                      <em>Select Customer</em>
                    </MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.customer_id} value={customer.customer_id}>
                        {customer.name} {customer.village && `- ${customer.village}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Distributor</InputLabel>
                  <Select
                    value={formData.distributor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, distributor_id: Number(e.target.value) })
                    }
                    label="Distributor"
                  >
                    <MenuItem value={0}>
                      <em>None</em>
                    </MenuItem>
                    {distributors.map((distributor) => (
                      <MenuItem key={distributor.distributor_id} value={distributor.distributor_id}>
                        {distributor.name} {distributor.village && `- ${distributor.village}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Product</InputLabel>
                  <Select
                    value={formData.product_id}
                    onChange={(e) =>
                      setFormData({ ...formData, product_id: Number(e.target.value) })
                    }
                    label="Product"
                  >
                    <MenuItem value={0}>
                      <em>Select Product</em>
                    </MenuItem>
                    {products.map((product) => (
                      <MenuItem key={product.product_id} value={product.product_id}>
                        {product.product_name}
                        {product.capacity_ltr && ` (${product.capacity_ltr}L)`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Quantity Provided"
                  value={formData.quantity_provided}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_provided: Number(e.target.value) })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Demo Date *"
                    value={formData.demo_date}
                    onChange={(date) =>
                      setFormData({ ...formData, demo_date: date || new Date() })
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <TimePicker
                    label="Demo Time *"
                    value={formData.demo_time}
                    onChange={(time) =>
                      setFormData({ ...formData, demo_time: time || new Date() })
                    }
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Follow-up Date"
                    value={formData.follow_up_date}
                    onChange={(date) => setFormData({ ...formData, follow_up_date: date })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Demo Location"
                  value={formData.demo_location}
                  onChange={(e) =>
                    setFormData({ ...formData, demo_location: e.target.value })
                  }
                  placeholder="Enter location"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the demo"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : "Schedule Demo"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
