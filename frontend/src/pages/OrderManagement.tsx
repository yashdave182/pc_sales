import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { customerAPI, salesAPI, paymentAPI } from "../services/api";

interface Customer {
  customer_id: number;
  name: string;
  mobile?: string;
  village?: string;
  [key: string]: any;
}

interface Order {
  sale_id: number;
  invoice_no: string;
  customer_id: number;
  customer_name?: string;
  customer_mobile?: string;
  sale_date: string;
  total_amount: number;
  total_liters: number;
  payment_status: string;
  order_status?: string;
  shipment_status?: string;
  shipment_date?: string;
  dispatch_date?: string;
  delivery_date?: string;
  tracking_number?: string;
  notes?: string;
}

interface OrderStatusUpdate {
  order_status: string;
  shipment_status: string;
  shipment_date?: string;
  dispatch_date?: string;
  delivery_date?: string;
  tracking_number?: string;
  notes?: string;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [orderUpdate, setOrderUpdate] = useState<OrderStatusUpdate>({
    order_status: "pending",
    shipment_status: "not_shipped",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesResponse, customersResponse] = await Promise.all([
        salesAPI.getAll(),
        customerAPI.getAll(),
      ]);

      // Map customer data to sales
      const customersMap = new Map<number, Customer>(
        customersResponse.data?.map((c: Customer) => [c.customer_id, c]) || [],
      );

      const ordersData = (salesResponse.data || salesResponse || []).map(
        (sale: any) => {
          const customer =
            customersMap.get(sale.customer_id) || ({} as Customer);
          return {
            ...sale,
            customer_name: customer.name || "Unknown",
            customer_mobile: customer.mobile || "N/A",
            order_status: sale.order_status || "pending",
            shipment_status: sale.shipment_status || "not_shipped",
          };
        },
      );

      setOrders(ordersData);
      setCustomers(customersResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusColor = (status: string) => {
    const statusColors: { [key: string]: any } = {
      pending: "warning",
      processing: "info",
      completed: "success",
      cancelled: "error",
    };
    return statusColors[status] || "default";
  };

  const getShipmentStatusColor = (status: string) => {
    const statusColors: { [key: string]: any } = {
      not_shipped: "default",
      preparing: "warning",
      shipped: "info",
      in_transit: "primary",
      delivered: "success",
    };
    return statusColors[status] || "default";
  };

  const getPaymentStatusColor = (status: string) => {
    const statusColors: { [key: string]: any } = {
      Pending: "error",
      Partial: "warning",
      Paid: "success",
    };
    return statusColors[status] || "default";
  };

  const getOrderSteps = (order: Order) => {
    const steps = [
      { label: "Order Placed", date: order.sale_date, completed: true },
      {
        label: "Preparing Shipment",
        date: order.shipment_date,
        completed: order.shipment_status !== "not_shipped",
      },
      {
        label: "Dispatched",
        date: order.dispatch_date,
        completed: ["shipped", "in_transit", "delivered"].includes(
          order.shipment_status || "",
        ),
      },
      {
        label: "Delivered",
        date: order.delivery_date,
        completed: order.shipment_status === "delivered",
      },
    ];
    return steps;
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order);
    setOrderUpdate({
      order_status: order.order_status || "pending",
      shipment_status: order.shipment_status || "not_shipped",
      shipment_date: order.shipment_date,
      dispatch_date: order.dispatch_date,
      delivery_date: order.delivery_date,
      tracking_number: order.tracking_number,
      notes: order.notes,
    });
    setUpdateDialogOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (!selectedOrder) return;

    try {
      await salesAPI.update(selectedOrder.sale_id, {
        ...selectedOrder,
        ...orderUpdate,
      });
      setUpdateDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_mobile?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || order.shipment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusStats = () => {
    return {
      total: orders.length,
      not_shipped: orders.filter((o) => o.shipment_status === "not_shipped")
        .length,
      preparing: orders.filter((o) => o.shipment_status === "preparing").length,
      shipped: orders.filter((o) => o.shipment_status === "shipped").length,
      in_transit: orders.filter((o) => o.shipment_status === "in_transit")
        .length,
      delivered: orders.filter((o) => o.shipment_status === "delivered").length,
    };
  };

  const stats = getStatusStats();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Order Management
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Total Orders
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: 4, borderColor: "grey.400" }}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Not Shipped
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {stats.not_shipped}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: 4, borderColor: "warning.main" }}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Preparing
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">
                {stats.preparing}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: 4, borderColor: "info.main" }}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Shipped
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="info.main">
                {stats.shipped}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: 4, borderColor: "primary.main" }}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                In Transit
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {stats.in_transit}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ borderLeft: 4, borderColor: "success.main" }}>
            <CardContent>
              <Typography color="textSecondary" variant="body2">
                Delivered
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.delivered}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by invoice, customer name, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ mr: 1, color: "grey.500" }} />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Shipment Status</InputLabel>
              <Select
                value={statusFilter}
                label="Shipment Status"
                onChange={(e) => setStatusFilter(e.target.value)}
                startAdornment={
                  <FilterIcon sx={{ mr: 1, color: "grey.500" }} />
                }
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="not_shipped">Not Shipped</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="shipped">Shipped</MenuItem>
                <MenuItem value="in_transit">In Transit</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell>
                <strong>Invoice No</strong>
              </TableCell>
              <TableCell>
                <strong>Customer</strong>
              </TableCell>
              <TableCell>
                <strong>Order Date</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Amount</strong>
              </TableCell>
              <TableCell>
                <strong>Order Status</strong>
              </TableCell>
              <TableCell>
                <strong>Shipment Status</strong>
              </TableCell>
              <TableCell>
                <strong>Payment Status</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No orders found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.sale_id} hover>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      {order.invoice_no}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.customer_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {order.customer_mobile}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(order.sale_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      ₹{order.total_amount?.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {order.total_liters}L
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.order_status || "Pending"}
                      color={getOrderStatusColor(
                        order.order_status || "pending",
                      )}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        order.shipment_status
                          ?.replace(/_/g, " ")
                          .toUpperCase() || "NOT SHIPPED"
                      }
                      color={getShipmentStatusColor(
                        order.shipment_status || "not_shipped",
                      )}
                      size="small"
                      icon={
                        order.shipment_status === "delivered" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ShippingIcon />
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.payment_status}
                      color={getPaymentStatusColor(order.payment_status)}
                      size="small"
                      icon={<PaymentIcon />}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleViewDetails(order)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Update Status">
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => handleUpdateStatus(order)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Order Details - {selectedOrder?.invoice_no}</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Customer Information
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedOrder.customer_name}
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.customer_mobile}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Order Information
                  </Typography>
                  <Typography variant="body2">
                    Date:{" "}
                    {new Date(selectedOrder.sale_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Amount: ₹{selectedOrder.total_amount?.toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Volume: {selectedOrder.total_liters}L
                  </Typography>
                </Grid>
              </Grid>

              <Box mt={4}>
                <Typography variant="subtitle2" color="textSecondary" mb={2}>
                  Order Timeline
                </Typography>
                <Stepper
                  activeStep={
                    getOrderSteps(selectedOrder).filter((s) => s.completed)
                      .length - 1
                  }
                  alternativeLabel
                >
                  {getOrderSteps(selectedOrder).map((step, index) => (
                    <Step key={index} completed={step.completed}>
                      <StepLabel>
                        <Typography variant="body2">{step.label}</Typography>
                        {step.date && (
                          <Typography variant="caption" color="textSecondary">
                            {new Date(step.date).toLocaleDateString()}
                          </Typography>
                        )}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              {selectedOrder.tracking_number && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    <strong>Tracking Number:</strong>{" "}
                    {selectedOrder.tracking_number}
                  </Typography>
                </Alert>
              )}

              {selectedOrder.notes && (
                <Box mt={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Notes
                  </Typography>
                  <Typography variant="body2">{selectedOrder.notes}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Order Status</InputLabel>
                  <Select
                    value={orderUpdate.order_status}
                    label="Order Status"
                    onChange={(e) =>
                      setOrderUpdate({
                        ...orderUpdate,
                        order_status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Shipment Status</InputLabel>
                  <Select
                    value={orderUpdate.shipment_status}
                    label="Shipment Status"
                    onChange={(e) =>
                      setOrderUpdate({
                        ...orderUpdate,
                        shipment_status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="not_shipped">Not Shipped</MenuItem>
                    <MenuItem value="preparing">Preparing</MenuItem>
                    <MenuItem value="shipped">Shipped</MenuItem>
                    <MenuItem value="in_transit">In Transit</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Shipment Date"
                  type="date"
                  value={orderUpdate.shipment_date || ""}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      shipment_date: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Dispatch Date"
                  type="date"
                  value={orderUpdate.dispatch_date || ""}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      dispatch_date: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Delivery Date"
                  type="date"
                  value={orderUpdate.delivery_date || ""}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      delivery_date: e.target.value,
                    })
                  }
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tracking Number"
                  value={orderUpdate.tracking_number || ""}
                  onChange={(e) =>
                    setOrderUpdate({
                      ...orderUpdate,
                      tracking_number: e.target.value,
                    })
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={orderUpdate.notes || ""}
                  onChange={(e) =>
                    setOrderUpdate({ ...orderUpdate, notes: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveUpdate}
            variant="contained"
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
