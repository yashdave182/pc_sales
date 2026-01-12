import { useState, useEffect } from "react";
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputAdornment,
    IconButton,
    Tooltip,
} from "@mui/material";
import {
    Refresh as RefreshIcon,
    Save as SaveIcon,
    Edit as EditIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "https://pc-sales-8phu.onrender.com";

interface Product {
    product_id: number;
    product_name: string;
    packing_type?: string;
    capacity_ltr?: number;
    category?: string;
    standard_rate?: number;
    is_active: number;
}

export default function ProductPricing() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editingPrices, setEditingPrices] = useState<Record<number, number>>(
        {},
    );
    const [editMode, setEditMode] = useState<Record<number, boolean>>({});

    // Check if user is admin
    useEffect(() => {
        if (user && user.email !== "admin@gmail.com") {
            setError("Access denied. Admin privileges required.");
            setTimeout(() => {
                navigate("/dashboard");
            }, 2000);
        }
    }, [user, navigate]);

    // Load all products
    const loadProducts = async () => {
        if (!user || user.email !== "admin@gmail.com") return;

        try {
            setLoading(true);
            setError(null);

            const response = await axios.get(`${API_BASE_URL}/api/products/all`, {
                headers: {
                    "x-user-email": user.email,
                },
            });

            setProducts(response.data || []);
        } catch (err: any) {
            console.error("Error loading products:", err);
            setError(err.response?.data?.detail || "Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.email === "admin@gmail.com") {
            loadProducts();
        }
    }, [user]);

    const handleEdit = (productId: number, currentPrice?: number) => {
        setEditMode({ ...editMode, [productId]: true });
        setEditingPrices({
            ...editingPrices,
            [productId]: currentPrice || 0,
        });
    };

    const handleCancel = (productId: number) => {
        const newEditMode = { ...editMode };
        const newEditingPrices = { ...editingPrices };
        delete newEditMode[productId];
        delete newEditingPrices[productId];
        setEditMode(newEditMode);
        setEditingPrices(newEditingPrices);
    };

    const handlePriceChange = (productId: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        setEditingPrices({
            ...editingPrices,
            [productId]: numValue,
        });
    };

    const handleSave = async (product: Product) => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const newPrice = editingPrices[product.product_id];

            await axios.put(
                `${API_BASE_URL}/api/admin/update-product-price/${product.product_id}`,
                {
                    standard_rate: newPrice,
                },
                {
                    headers: {
                        "x-user-email": user?.email,
                    },
                },
            );

            // Update local state
            setProducts(
                products.map((p) =>
                    p.product_id === product.product_id
                        ? { ...p, standard_rate: newPrice }
                        : p,
                ),
            );

            // Exit edit mode
            handleCancel(product.product_id);

            setSuccess(`Price updated for ${product.product_name}`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Error updating price:", err);
            setError(err.response?.data?.detail || "Failed to update price");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            // Update all products that are in edit mode
            const updates = Object.keys(editMode)
                .filter((key) => editMode[parseInt(key)])
                .map((key) => {
                    const productId = parseInt(key);
                    return {
                        product_id: productId,
                        standard_rate: editingPrices[productId],
                    };
                });

            if (updates.length === 0) {
                setError("No changes to save");
                return;
            }

            await axios.post(
                `${API_BASE_URL}/api/admin/update-product-prices-bulk`,
                { updates },
                {
                    headers: {
                        "x-user-email": user?.email,
                    },
                },
            );

            // Reload products
            await loadProducts();

            // Clear edit mode
            setEditMode({});
            setEditingPrices({});

            setSuccess(`Successfully updated ${updates.length} product prices`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Error updating prices:", err);
            setError(err.response?.data?.detail || "Failed to update prices");
        } finally {
            setSaving(false);
        }
    };

    if (!user || user.email !== "admin@gmail.com") {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "60vh",
                }}
            >
                <Alert severity="error">
                    Access denied. This page is only accessible to admin@gmail.com
                </Alert>
            </Box>
        );
    }

    const hasChanges = Object.keys(editMode).some((key) => editMode[parseInt(key)]);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Product Pricing Management
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Update default prices for all products in the system
                    </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={loadProducts} color="primary" disabled={loading}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                    {hasChanges && (
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveAll}
                            disabled={saving}
                        >
                            Save All Changes
                        </Button>
                    )}
                </Box>
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

            {/* Products Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        All Products ({products.length})
                    </Typography>

                    {loading ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: 400,
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Packing Type</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Capacity (Ltr)</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Standard Rate (₹)</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                                <Typography color="text.secondary">
                                                    No products found
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        products.map((product) => (
                                            <TableRow
                                                key={product.product_id}
                                                hover
                                                sx={{
                                                    "&:hover": {
                                                        bgcolor: "action.hover",
                                                    },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {product.product_name}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {product.packing_type || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {product.capacity_ltr || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {product.category || "-"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {editMode[product.product_id] ? (
                                                        <TextField
                                                            size="small"
                                                            type="number"
                                                            value={editingPrices[product.product_id] || 0}
                                                            onChange={(e) =>
                                                                handlePriceChange(product.product_id, e.target.value)
                                                            }
                                                            InputProps={{
                                                                startAdornment: (
                                                                    <InputAdornment position="start">₹</InputAdornment>
                                                                ),
                                                            }}
                                                            sx={{ width: 120 }}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2">
                                                            ₹{product.standard_rate?.toFixed(2) || "0.00"}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1,
                                                            bgcolor:
                                                                product.is_active === 1
                                                                    ? "success.light"
                                                                    : "error.light",
                                                            color:
                                                                product.is_active === 1
                                                                    ? "success.dark"
                                                                    : "error.dark",
                                                        }}
                                                    >
                                                        {product.is_active === 1 ? "Active" : "Inactive"}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {editMode[product.product_id] ? (
                                                        <Box sx={{ display: "flex", gap: 1 }}>
                                                            <Tooltip title="Save">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
                                                                    onClick={() => handleSave(product)}
                                                                    disabled={saving}
                                                                >
                                                                    <SaveIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Cancel">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleCancel(product.product_id)}
                                                                    disabled={saving}
                                                                >
                                                                    <CancelIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    ) : (
                                                        <Tooltip title="Edit Price">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        product.product_id,
                                                                        product.standard_rate,
                                                                    )
                                                                }
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
