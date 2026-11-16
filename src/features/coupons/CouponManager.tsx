import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { couponService } from "../../services/couponService";
import CouponEditor from "./CouponEditor";
import { couponStatus, formatMoney } from "./coupon.utils";
import type { Coupon, CouponStatus } from "./coupon.types";

const { Title, Text } = Typography;
const statuses: Record<CouponStatus, { label: string; color: string }> = {
  active: { label: "Đang hoạt động", color: "success" },
  scheduled: { label: "Sắp diễn ra", color: "processing" },
  expired: { label: "Đã hết hạn", color: "default" },
  exhausted: { label: "Hết lượt", color: "warning" },
  inactive: { label: "Đã tắt", color: "error" },
};

export default function CouponManager({ role }: { role: "host" | "admin" }) {
  const { message } = App.useApp();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CouponStatus | undefined>();
  const [source, setSource] = useState<"HOST" | "ADMIN" | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef(0);

  const load = useCallback(() => {
    const id = ++request.current;
    return couponService
      .list(role)
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error(
            "Dữ liệu mã giảm giá từ máy chủ không hợp lệ. Vui lòng thử lại.",
          );
        }
        if (request.current === id) {
          setCoupons(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (request.current === id)
          setError(
            err instanceof Error ? err.message : "Không thể tải mã giảm giá.",
          );
      })
      .finally(() => {
        if (request.current === id) setLoading(false);
      });
  }, [role]);

  const reload = () => {
    setLoading(true);
    setError(null);
    void load();
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      request.current += 1;
      window.clearInterval(timer);
    };
  }, [load]);

  const change = async (coupon: Coupon, action: "toggle" | "delete") => {
    setBusyIds((ids) => [...ids, coupon.id]);
    try {
      if (action === "delete") {
        const result = await couponService.remove(coupon.id);
        message.success(result.message);
      } else {
        if (role === "admin" && coupon.created_by_role === "HOST") {
          await couponService.deactivate(coupon.id);
        } else {
          await couponService.update(role, coupon.id, {
            is_active: coupon.is_active ? 0 : 1,
          });
        }
        message.success(
          coupon.is_active ? "Đã tắt mã giảm giá." : "Đã bật mã giảm giá.",
        );
      }
      setLoading(true);
      await load();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "Không thể cập nhật mã giảm giá.",
      );
    } finally {
      setBusyIds((ids) => ids.filter((id) => id !== coupon.id));
    }
  };

  const filtered = coupons.filter((coupon) => {
    const text = `${coupon.code} ${coupon.name ?? ""}`.toLocaleLowerCase(
      "vi-VN",
    );
    return (
      text.includes(search.trim().toLocaleLowerCase("vi-VN")) &&
      (!status || couponStatus(coupon, now) === status) &&
      (!source || coupon.created_by_role === source)
    );
  });
  const columns: TableColumnsType<Coupon> = [
    {
      title: "Mã / Chương trình",
      key: "code",
      width: 230,
      render: (_, c) => (
        <>
          <Typography.Text copyable={{ text: c.code }} strong>
            <GiftOutlined /> {c.code}
          </Typography.Text>
          {c.name && (
            <div>
              <Text type="secondary">{c.name}</Text>
            </div>
          )}
          {role === "admin" && (
            <Tag
              style={{ marginTop: 6 }}
              color={c.created_by_role === "ADMIN" ? "blue" : "purple"}
            >
              {c.created_by_role === "ADMIN"
                ? "Toàn sàn"
                : `Chủ nhà #${c.host_id}`}
            </Tag>
          )}
        </>
      ),
    },
    {
      title: "Mức giảm",
      key: "discount",
      width: 200,
      render: (_, c) => (
        <>
          <Text strong style={{ color: "#059669" }}>
            {c.discount_type === "PERCENTAGE"
              ? `${Number(c.discount_value)}%`
              : formatMoney(c.discount_value)}
          </Text>
          {c.max_discount !== null && (
            <div>
              <Text type="secondary">Tối đa {formatMoney(c.max_discount)}</Text>
            </div>
          )}
          <div>
            <Text type="secondary">
              Đơn từ {formatMoney(c.min_order_value)}
            </Text>
          </div>
        </>
      ),
    },
    {
      title: "Đối tượng",
      key: "audience",
      width: 200,
      render: (_, c) =>
        c.target_audience === "LOYALTY" ? (
          <>
            <Tag color="magenta">Khách thân thiết</Tag>
            <div>
              <Text type="secondary">
                {[
                  c.min_completed_bookings
                    ? `Từ ${c.min_completed_bookings} chuyến đi`
                    : null,
                  c.min_total_spent
                    ? `Chi tiêu từ ${formatMoney(c.min_total_spent)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(c.loyalty_condition_type === "AND" ? " và " : " hoặc ")}
              </Text>
            </div>
          </>
        ) : (
          <Tag>Tất cả khách hàng</Tag>
        ),
    },
    {
      title: "Thời gian",
      key: "dates",
      width: 180,
      render: (_, c) => (
        <>
          <div>
            {new Date(c.start_date).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            –
          </div>
          <div>
            {new Date(c.end_date).toLocaleDateString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </div>
        </>
      ),
    },
    {
      title: "Lượt sử dụng",
      key: "usage",
      width: 160,
      render: (_, c) => (
        <>
          <Text strong>
            {c.used_count ?? 0} / {c.usage_limit ?? "∞"}
          </Text>
          <div>
            <Text type="secondary">{c.per_user_limit} lượt / khách</Text>
          </div>
        </>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 150,
      render: (_, c) => {
        const current = statuses[couponStatus(c, now)];
        return <Tag color={current.color}>{current.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 240,
      render: (_, c) => {
        const canEdit = role === "host" || c.created_by_role === "ADMIN";
        const busy = busyIds.includes(c.id);
        return (
          <Space wrap>
            {canEdit && (
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={busy || !!error}
                onClick={() => {
                  setEditing(c);
                  setEditorOpen(true);
                }}
              >
                Sửa
              </Button>
            )}
            {(canEdit || !!c.is_active) && (
              <Popconfirm
                title={
                  c.is_active ? `Tắt mã ${c.code}?` : `Bật lại mã ${c.code}?`
                }
                description={
                  c.is_active
                    ? "Khách sẽ không thể dùng mã cho đơn mới."
                    : "Mã vẫn cần đủ hạn sử dụng và còn lượt."
                }
                okText="Xác nhận"
                cancelText="Hủy"
                onConfirm={() => change(c, "toggle")}
              >
                <Button size="small" loading={busy} disabled={!!error}>
                  {c.is_active ? "Tắt mã" : "Bật mã"}
                </Button>
              </Popconfirm>
            )}
            {role === "host" && (
              <Popconfirm
                title={`Xóa mã ${c.code}?`}
                description="Mã có lịch sử sử dụng sẽ được tắt để giữ thông tin đơn hàng."
                okText="Xác nhận"
                cancelText="Hủy"
                onConfirm={() => change(c, "delete")}
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={busy || !!error}
                >
                  Xóa
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: "0 0 6px" }}>
            Mã giảm giá & ưu đãi
          </Title>
          <Text type="secondary">
            {role === "host"
              ? "Quản lý ưu đãi cho các chỗ nghỉ của bạn."
              : "Quản lý mã toàn sàn và theo dõi ưu đãi của chủ nhà."}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          Tạo mã giảm giá
        </Button>
      </div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: "Tổng số mã", value: coupons.length },
          {
            title: "Đang hoạt động",
            value: coupons.filter((c) => couponStatus(c, now) === "active")
              .length,
          },
          {
            title: "Sắp diễn ra",
            value: coupons.filter((c) => couponStatus(c, now) === "scheduled")
              .length,
          },
          {
            title: "Lượt đã dùng / đang giữ",
            value: coupons.reduce(
              (sum, c) => sum + Number(c.used_count ?? 0),
              0,
            ),
          },
        ].map((stat) => (
          <Col xs={12} lg={6} key={stat.title}>
            <Card>
              <Statistic
                title={stat.title}
                value={error ? "—" : stat.value}
                loading={loading}
              />
            </Card>
          </Col>
        ))}
      </Row>
      {error && (
        <Alert
          type="error"
          showIcon
          title="Không thể tải danh sách mã giảm giá"
          description={error}
          action={<Button onClick={reload}>Thử lại</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <Card>
        <Space wrap style={{ marginBottom: 20 }}>
          <Input.Search
            placeholder="Tìm theo mã hoặc tên chương trình"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300, maxWidth: "100%" }}
          />
          <Select
            aria-label="Lọc trạng thái"
            placeholder="Tất cả trạng thái"
            allowClear
            value={status}
            onChange={setStatus}
            style={{ width: 180 }}
            options={Object.entries(statuses).map(([value, item]) => ({
              value,
              label: item.label,
            }))}
          />
          {role === "admin" && (
            <Select
              aria-label="Lọc nguồn mã"
              placeholder="Tất cả nguồn mã"
              allowClear
              value={source}
              onChange={setSource}
              style={{ width: 160 }}
              options={[
                { value: "ADMIN", label: "Mã toàn sàn" },
                { value: "HOST", label: "Mã chủ nhà" },
              ]}
            />
          )}
          <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
            Tải lại
          </Button>
        </Space>
        <Table<Coupon>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          scroll={{ x: 1350 }}
          locale={{
            emptyText: (
              <Empty
                description={
                  error
                    ? "Chưa tải được dữ liệu."
                    : search || status || source
                      ? "Không có mã phù hợp với bộ lọc."
                      : "Chưa có mã giảm giá. Hãy tạo ưu đãi đầu tiên."
                }
              />
            ),
          }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} mã giảm giá`,
          }}
        />
      </Card>
      {editorOpen && (
        <CouponEditor
          role={role}
          coupon={editing}
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
