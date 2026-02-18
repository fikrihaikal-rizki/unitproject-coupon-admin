export function getVariant(status: string) {
    switch (status) {
        // outline
        case "pending":
            return "outline";
        case "draft":
            return "outline";
        // secondary
        case "active":
            return "secondary";
        case "resolved":
            return "secondary";
        case "completed":
            return "secondary";
        // destructive
        case "inactive":
            return "destructive";
        case "deleted":
            return "destructive";
        case "cancelled":
            return "destructive";
        // default
        default:
            return "default";
    }
}

export function getClassStatus(status: string) {
    // success|verified|
    switch (status) {
        // success
        case "active":
            return "bg-green-500 text-white dark:bg-green-600";
        case "resolved":
            return "bg-green-500 text-white dark:bg-green-600";
        case "completed":
            return "bg-green-500 text-white dark:bg-green-600";
        // default
        default:
            return "";
    }
}