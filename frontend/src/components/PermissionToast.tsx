import React from "react";
import { Snackbar, Alert } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import type { PermissionToastState } from "../hooks/usePermissionAction";

interface PermissionToastProps {
    state: PermissionToastState;
    onClose: () => void;
}

/**
 * PermissionToast
 * ───────────────
 * A thin wrapper around MUI Snackbar that displays the "not authorised" toast
 * produced by usePermissionAction. Drop it anywhere in a component tree —
 * typically at the bottom of a page that uses usePermissionAction.
 *
 * Usage:
 *   const { guard, toastState, closeToast } = usePermissionAction();
 *   ...
 *   <PermissionToast state={toastState} onClose={closeToast} />
 */
const PermissionToast: React.FC<PermissionToastProps> = ({ state, onClose }) => (
    <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
        <Alert
            onClose={onClose}
            severity="warning"
            variant="filled"
            icon={<LockIcon />}
            sx={{ width: "100%", fontWeight: 600 }}
        >
            Not authorised — requires&nbsp;
            <strong>&ldquo;{state.label}&rdquo;</strong>&nbsp;permission.
        </Alert>
    </Snackbar>
);

export default PermissionToast;
