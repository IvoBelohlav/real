import React from 'react';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Error caught by error boundary:", error, errorInfo);
        this.setState({errorInfo});
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className={styles.errorContainer}>
                   <p className={styles.errorMessage}>Ups, something went wrong. Try reloading the app.</p>
                   {this.state.errorInfo && <details>
                        <summary className={styles.errorSummary}>More Details</summary>
                        <div className={styles.errorDetails}>
                            {this.state.errorInfo.componentStack}
                        </div>
                   </details>
                   }
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;