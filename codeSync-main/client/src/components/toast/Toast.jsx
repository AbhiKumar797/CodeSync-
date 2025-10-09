import { Toaster } from "react-hot-toast";

function Toast() {
    return (
        <Toaster
            position="top-right"
            gutter={12}
            toastOptions={{
                // Default toast styles
                style: {
                    background: "#2a2a2a",
                    color: "#ffffff",
                    border: "1px solid #4a4a4a",
                    borderRadius: "8px",
                    padding: "16px",
                },
                // Custom styles for success toasts
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: "#39E079",
                        secondary: "#1a1a1a",
                    },
                    style: {
                        borderColor: "#39E079",
                    },
                },
                // Custom styles for error toasts
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: "#ff4b4b",
                        secondary: "#1a1a1a",
                    },
                    style: {
                        borderColor: "#ff4b4b",
                    },
                },
                // Custom styles for loading toasts
                loading: {
                    style: {
                        borderColor: "#5865F2",
                    },
                },
            }}
        />
    );
}

export default Toast;
