import React, { useState } from "react";
import {
    Box,
    Typography,
    Snackbar,
    Alert,
    Tooltip,
    Button,
    Paper,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "../contexts/AuthContext";

interface PermissionGateProps {
    /**
     * Required permission key(s). User needs at least ONE of them.
     */
    permission: string | string[];

    /**
     * How to render when the user lacks permission:
     *
     *   "block"  – Always render children, but grey them out, block clicks, show toast.
     *              Use this for buttons, charts, action icons, dashboard cards.
     *
     *   "page"   – Show a full "Permission Required" state instead of children.
     *              Use this at the root of a page/section view.
     *
     *   "hide"   – Show `fallback` (or a subtle lock card) instead of children.
     *              Default — use when hiding a discrete widget makes sense.
     *
     *   "silent" – Render nothing at all when denied.
     */
    mode?: "block" | "page" | "hide" | "silent";

    /** Shorthand for mode="silent" (backwards compat). */
    silent?: boolean;
    /** Shorthand for mode="block". */
    block?: boolean;
    /** Shorthand for mode="page". */
    page?: boolean;

    /** Custom element shown when denied (only for "hide" mode). */
    fallback?: React.ReactNode;

    /**
     * Human-readable label for the toast, e.g. "view payments".
     * Falls back to the raw permission key(s) if not provided.
     */
    permissionLabel?: string;

    children: React.ReactNode;
}

/**
 * PermissionGate — Universal permission boundary component.
 *
 * ── block (for interactive UI elements) ──────────────────────────────────────
 * Children always render, but are dimmed + pointer-event blocked.
 * Clicking the overlay shows a "Not authorised — requires X" toast.
 * Does NOT break Grid / Flex layouts (uses display:block wrapper).
 *
 * ── page (for full page/section boundaries) ──────────────────────────────────
 * Renders a full "Permission Required" state replacing the page content.
 * Use at the top level of page components.
 *
 * ── hide ─────────────────────────────────────────────────────────────────────
 * Shows `fallback` prop or a subtle lock-card placeholder.
 *
 * ── silent ───────────────────────────────────────────────────────────────────
 * Renders nothing at all.
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    mode,
    silent,
    block,
    page,
    fallback,
    permissionLabel,
    children,
}) => {
    const { hasPermission, permissionsLoaded } = useAuth();
    const [toastOpen, setToastOpen] = useState(false);

    const effectiveMode: "block" | "page" | "hide" | "silent" =
        mode ?? (block ? "block" : page ? "page" : silent ? "silent" : "hide");

    // While permissions are still loading — render nothing to avoid flash
    if (!permissionsLoaded) return null;

    const perms = Array.isArray(permission) ? permission : [permission];
    const allowed = perms.some((p) => hasPermission(p));

    // ── Allowed ───────────────────────────────────────────────────────────────
    if (allowed) return <>{children}</>;

    // ── Denied ────────────────────────────────────────────────────────────────

    const label =
        permissionLabel ?? perms.map((p) => p.replace(/_/g, " ")).join(" / ");

    // ── block ─────────────────────────────────────────────────────────────────
    // Renders children greyed-out with a transparent click interceptor overlay.
    // Uses display:block so it doesn't break Grid/Flex child constraints.
    if (effectiveMode === "block") {
        return (
            <>
                <Tooltip title={`🔒 Requires "${label}" permission`} arrow placement="top">
                    <Box
                        sx={{
                            position: "relative",
                            display: "block",
                            width: "100%",
                            height: "100%",
                        }}
                    >
                        {/* Transparent overlay — intercepts all pointer events */}
                        <Box
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setToastOpen(true);
                            }}
                            sx={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 10,
                                cursor: "not-allowed",
                                borderRadius: "inherit",
                            }}
                        />
                        {/* Children — dimmed, pointer-events disabled */}
                        <Box
                            sx={{
                                opacity: 0.45,
                                filter: "grayscale(40%)",
                                pointerEvents: "none",
                            }}
                        >
                            {children}
                        </Box>
                    </Box>
                </Tooltip>

                <Snackbar
                    open={toastOpen}
                    autoHideDuration={4000}
                    onClose={() => setToastOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setToastOpen(false)}
                        severity="warning"
                        variant="filled"
                        icon={<LockIcon />}
                        sx={{ width: "100%", fontWeight: 600 }}
                    >
                        Not authorised — requires&nbsp;
                        <strong>&ldquo;{label}&rdquo;</strong>&nbsp;permission.
                    </Alert>
                </Snackbar>
            </>
        );
    }

    // ── page ──────────────────────────────────────────────────────────────────
    // Full-page "Permission Required" state.
    if (effectiveMode === "page") {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    gap: 2,
                    py: 8,
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        p: 6,
                        borderRadius: 4,
                        border: "1.5px dashed",
                        borderColor: "divider",
                        maxWidth: 440,
                        textAlign: "center",
                    }}
                >
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #f59e0b22 0%, #ef444422 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <LockOutlinedIcon sx={{ fontSize: 36, color: "warning.main" }} />
                    </Box>
                    <Typography variant="h5" fontWeight={700}>
                        Permission Required
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        You need the&nbsp;
                        <Box component="span" sx={{ fontWeight: 700, color: "warning.main" }}>
                            &ldquo;{label}&rdquo;
                        </Box>
                        &nbsp;permission to access this section.
                        <br />
                        Contact your administrator to request access.
                    </Typography>
                    <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        onClick={() => window.history.back()}
                        sx={{ mt: 1 }}
                    >
                        Go Back
                    </Button>
                </Paper>
            </Box>
        );
    }

    // ── silent ────────────────────────────────────────────────────────────────
    if (effectiveMode === "silent") return null;

    // ── hide (default) ────────────────────────────────────────────────────────
    if (fallback !== undefined) return <>{fallback}</>;

    return (
        <Paper
            variant="outlined"
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                p: 4,
                borderRadius: 3,
                borderStyle: "dashed",
                minHeight: 140,
                opacity: 0.55,
                userSelect: "none",
            }}
        >
            <LockIcon sx={{ fontSize: 32, color: "text.disabled" }} />
            <Typography variant="body2" color="text.disabled" fontWeight={500}>
                You don&apos;t have permission to view this section.
            </Typography>
        </Paper>
    );
};

export default PermissionGate;
