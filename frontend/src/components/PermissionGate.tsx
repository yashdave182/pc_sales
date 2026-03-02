import React from "react";
import { useAuth } from "../contexts/AuthContext";

interface PermissionGateProps {
    /**
     * Required permission key(s). User needs at least ONE of them.
     */
    permission: string | string[];

    /**
     * What to render when the user lacks permission.
     * Defaults to null (renders nothing).
     */
    fallback?: React.ReactNode;

    children: React.ReactNode;

    // Legacy props kept for call-site compatibility — all ignored now.
    // Previously used for "block", "page", "silent", "hide" modes.
    // Everything is now silent: unauthorised → render nothing.
    block?: boolean;
    page?: boolean;
    silent?: boolean;
    mode?: string;
    permissionLabel?: string;
}

/**
 * PermissionGate — Simple permission boundary.
 *
 * If the user HAS the permission  → renders children normally.
 * If the user LACKS the permission → renders nothing (or `fallback` if provided).
 *
 * Works for any level: pages, sections, buttons, icons — anything.
 * The backend enforces permissions on every API call as the real safeguard.
 */
const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    fallback = null,
    children,
}) => {
    const { hasPermission, permissionsLoaded } = useAuth();

    // Don't render anything until permissions have loaded — avoids flash of content.
    if (!permissionsLoaded) return null;

    const perms = Array.isArray(permission) ? permission : [permission];
    const allowed = perms.some((p) => hasPermission(p));

    return allowed ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;
