import { useCallback, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

/**
 * usePermissionAction
 * ───────────────────
 * Wraps any event handler so that it only executes when the user has the
 * required permission. If they don't, a snackbar is shown instead.
 *
 * Returns:
 *   - `guard(handler, permission, label?)` → wrapped handler safe to pass to onClick
 *   - `toastState` + `closeToast` → consumed by <PermissionToast /> in Layout
 *
 * This hook is meant to be used at the page level so each page can self-manage
 * its action buttons without needing JSX wrappers around every button.
 *
 * ── Example ──────────────────────────────────────────────────────────────────
 *
 *   const { guard } = usePermissionAction();
 *
 *   <Button onClick={guard(handleCreate, PERMISSIONS.CREATE_SALE, "create sales")}>
 *     New Sale
 *   </Button>
 *
 *   <IconButton onClick={guard(handleDelete, PERMISSIONS.DELETE_SALE, "delete sales")}>
 *     <DeleteIcon />
 *   </IconButton>
 */

export interface PermissionToastState {
    open: boolean;
    label: string;
}

export function usePermissionAction() {
    const { hasPermission } = useAuth();
    const [toastState, setToastState] = useState<PermissionToastState>({
        open: false,
        label: "",
    });

    const closeToast = useCallback(() => {
        setToastState((s) => ({ ...s, open: false }));
    }, []);

    /**
     * guard(handler, permission, label?)
     *
     * Returns a new function that:
     *   - Calls `handler` when the user has the permission
     *   - Shows a toast when they don't
     */
    const guard = useCallback(
        <T extends (...args: any[]) => any>(
            handler: T,
            permission: string | string[],
            label?: string
        ): ((...args: Parameters<T>) => void) => {
            return (...args: Parameters<T>) => {
                const perms = Array.isArray(permission) ? permission : [permission];
                const allowed = perms.some((p) => hasPermission(p));

                if (allowed) {
                    handler(...args);
                } else {
                    const displayLabel =
                        label ??
                        perms.map((p) => p.replace(/_/g, " ")).join(" / ");
                    setToastState({ open: true, label: displayLabel });
                }
            };
        },
        [hasPermission]
    );

    return { guard, toastState, closeToast };
}
