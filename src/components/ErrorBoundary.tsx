import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Result
            status="error"
            title="Đã xảy ra sự cố hiển thị"
            subTitle="Một lỗi JavaScript đã xảy ra trên giao diện. Bạn có thể thử tải lại trang hoặc bấm thử lại."
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload} style={{ background: '#4f46e5' }}>
                Tải lại trang
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                Thử lại thao tác
              </Button>,
            ]}
          >
            {this.state.error && (
              <div style={{ textAlign: 'left', background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <Paragraph>
                  <Text strong style={{ color: '#dc2626' }}>
                    {this.state.error.name}: {this.state.error.message}
                  </Text>
                </Paragraph>
                {this.state.errorInfo?.componentStack && (
                  <pre style={{ fontSize: 11, color: '#64748b', overflowX: 'auto', maxHeight: 200 }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
