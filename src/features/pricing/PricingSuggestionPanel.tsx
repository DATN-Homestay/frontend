import { useId } from 'react';
import { Alert, Button, InputNumber, Tag } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import type { PricingSuggestion } from '../../types/host';
import {
  formatDemandFactor,
  formatVnd,
  isPriceWithinBounds,
  priceBounds,
} from './pricing.utils';
import './PricingSuggestionPanel.css';

export interface PricingSuggestionPanelProps {
  suggestion: PricingSuggestion;
  appliedPrice: number | null;
  onPriceChange: (price: number | null) => void;
  onApply: () => void;
  onDiscard: () => void;
  applying: boolean;
  disabled: boolean;
  locked: boolean;
  expired: boolean;
}

const numberFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
});

const demandLabels = {
  HIGH: { text: 'Nhu cầu cao', color: 'orange' },
  MEDIUM: { text: 'Nhu cầu vừa phải', color: 'blue' },
  LOW: { text: 'Nhu cầu thấp', color: 'cyan' },
  UNKNOWN: { text: 'Chưa xác định nhu cầu', color: 'default' },
};

const factorLabels = [
  { key: 'occupancy', label: 'Tỷ lệ kín phòng' },
  { key: 'calendar', label: 'Ngày lễ / cuối tuần' },
  { key: 'lead_time', label: 'Thời gian đặt trước' },
] as const;

/** Vietnamese grouping uses dots; a comma separates fractional đồng. */
function parsePrice(value: string | undefined): number {
  const plain = (value ?? '')
    .replace(/\s|₫|đ/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return plain ? Number(plain) : Number.NaN;
}

function describeWarning(warning: string): string {
  if (
    warning.includes('RapidAPI chưa bật') ||
    warning.includes('Chưa cấu hình đúng RapidAPI')
  ) {
    return 'Nguồn thị trường bên ngoài hiện chưa khả dụng. Gợi ý chỉ dùng lịch phòng hợp lệ trong hệ thống.';
  }
  if (warning.includes('giới hạn yêu cầu đồng bộ')) {
    return 'Một số chỗ nghỉ chưa được cập nhật trong lần này. Dữ liệu chưa được xác nhận đã được loại khỏi tập so sánh.';
  }
  if (warning.includes('Không lấy được dữ liệu thị trường mới từ RapidAPI')) {
    return 'Chưa thể cập nhật nguồn thị trường bên ngoài. Những mức giá quá cũ đã được loại khỏi tập so sánh.';
  }
  if (warning.includes('giá/phòng trống thiếu hoặc quá 6 giờ')) {
    return 'Dữ liệu giá hoặc phòng trống của một số chỗ nghỉ còn thiếu hoặc quá cũ nên đã được loại khỏi tập so sánh.';
  }
  return warning;
}

export default function PricingSuggestionPanel({
  suggestion,
  appliedPrice,
  onPriceChange,
  onApply,
  onDiscard,
  applying,
  disabled,
  locked,
  expired,
}: PricingSuggestionPanelProps) {
  const id = useId();
  const stats = suggestion.comp_set_stats;
  const insufficient =
    suggestion.data_status === 'INSUFFICIENT_DATA' || stats.compset_size <= 0;
  const bounds = priceBounds(suggestion.base_price);
  const canEdit =
    !disabled &&
    !locked &&
    !expired &&
    !insufficient &&
    !applying &&
    bounds !== null;
  const priceValid = isPriceWithinBounds(appliedPrice, suggestion.base_price);
  const invalidPrice = canEdit && appliedPrice !== null && !priceValid;
  const edited =
    appliedPrice !== null && appliedPrice !== suggestion.suggested_price;
  const demand =
    demandLabels[
      insufficient ? 'UNKNOWN' : (suggestion.demand_level ?? 'UNKNOWN')
    ];
  const dateLabel = suggestion.date.split('-').reverse().join('/');
  const direction =
    suggestion.change_percentage > 0
      ? 'up'
      : suggestion.change_percentage < 0
        ? 'down'
        : 'same';
  const hasMarketPrice =
    !insufficient &&
    stats.market_avg_price !== null &&
    Number.isFinite(stats.market_avg_price);
  const hasOccupancy =
    !insufficient &&
    stats.occupancy_rate !== null &&
    Number.isFinite(stats.occupancy_rate);
  const warnings = [
    ...new Set((suggestion.warnings ?? []).map(describeWarning)),
  ];

  return (
    <section className="pricing-suggestion" aria-labelledby={`${id}-title`}>
      <header className="pricing-suggestion__header">
        <div className="pricing-suggestion__heading">
          <span className="pricing-suggestion__icon" aria-hidden="true">
            <RobotOutlined />
          </span>
          <div>
            <p className="pricing-suggestion__eyebrow">GỢI Ý GIÁ CHO PHÒNG</p>
            <h3 className="pricing-suggestion__title" id={`${id}-title`}>
              Đề xuất cho ngày{' '}
              <time dateTime={suggestion.date}>{dateLabel}</time>
            </h3>
          </div>
        </div>
        <Tag color={demand.color} className="pricing-suggestion__demand-tag">
          {demand.text}
        </Tag>
      </header>

      <div className="pricing-suggestion__body">
        <div className="pricing-suggestion__insight">
          <p className="pricing-suggestion__section-label">Căn cứ đề xuất</p>
          <p className="pricing-suggestion__explanation">
            {suggestion.ai_explanation}
          </p>

          {insufficient && (
            <Alert
              type="info"
              showIcon
              title="Chưa đủ dữ liệu để điều chỉnh giá"
              description="Giá đang bán được giữ nguyên. Bạn có thể lấy lại gợi ý khi có thêm dữ liệu thị trường."
              className="pricing-suggestion__alert"
            />
          )}

          <dl
            className="pricing-suggestion__stats"
            aria-label="Dữ liệu các chỗ nghỉ tương đồng trong bán kính 5 km"
          >
            <div className="pricing-suggestion__stat">
              <dt>Đối thủ tương đồng</dt>
              <dd>
                {numberFormatter.format(stats.compset_size)}{' '}
                <span>chỗ nghỉ</span>
              </dd>
            </div>
            <div className="pricing-suggestion__stat">
              <dt>Giá trung bình thị trường</dt>
              <dd
                className={
                  hasMarketPrice ? '' : 'pricing-suggestion__unavailable'
                }
              >
                {hasMarketPrice
                  ? formatVnd(stats.market_avg_price)
                  : 'Chưa có dữ liệu'}
              </dd>
            </div>
            <div className="pricing-suggestion__stat">
              <dt>Tỷ lệ kín phòng</dt>
              <dd
                className={
                  hasOccupancy ? '' : 'pricing-suggestion__unavailable'
                }
              >
                {hasOccupancy
                  ? `${numberFormatter.format(stats.occupancy_rate)}%`
                  : 'Chưa có dữ liệu'}
              </dd>
            </div>
          </dl>

          <div className="pricing-suggestion__factors">
            <div className="pricing-suggestion__factor-heading">
              <span>Ảnh hưởng đến nhu cầu</span>
              <span className="pricing-suggestion__factor-note">
                Mức điều chỉnh
              </span>
            </div>
            <dl>
              {factorLabels.map(({ key, label }) => {
                const factor = suggestion.demand_factors?.[key];
                const present =
                  !insufficient &&
                  typeof factor === 'number' &&
                  Number.isFinite(factor);
                return (
                  <div className="pricing-suggestion__factor" key={key}>
                    <dt>{label}</dt>
                    <dd
                      className={
                        present && factor !== 0
                          ? 'pricing-suggestion__factor-value'
                          : ''
                      }
                    >
                      {present ? formatDemandFactor(factor) : 'Chưa có dữ liệu'}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="pricing-suggestion__factor-footnote">
              Các yếu tố này cùng giá thị trường là căn cứ tính giá đề xuất.
            </p>
          </div>

          {warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              title="Lưu ý về dữ liệu thị trường"
              description={
                <ul className="pricing-suggestion__warnings">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              }
              className="pricing-suggestion__alert"
            />
          )}
          <p className="pricing-suggestion__source">
            <InfoCircleOutlined aria-hidden="true" />
            {suggestion.cache_status === 'CACHE_HIT'
              ? 'Dữ liệu thị trường có sẵn'
              : 'Đã kiểm tra nguồn thị trường'}
          </p>
        </div>

        <div className="pricing-suggestion__decision">
          <div className="pricing-suggestion__proposal">
            <p className="pricing-suggestion__proposal-label">
              {insufficient
                ? 'Chưa có đề xuất điều chỉnh'
                : 'Mức giá AI đề xuất'}
            </p>
            <div className="pricing-suggestion__proposed-price">
              {insufficient
                ? 'Chờ thêm dữ liệu'
                : formatVnd(suggestion.suggested_price)}
            </div>
            {!insufficient && (
              <p
                className={`pricing-suggestion__change pricing-suggestion__change--${direction}`}
              >
                {direction === 'up' ? (
                  <ArrowUpOutlined aria-hidden="true" />
                ) : direction === 'down' ? (
                  <ArrowDownOutlined aria-hidden="true" />
                ) : null}
                {formatDemandFactor(suggestion.change_percentage / 100)} so với
                giá gốc
              </p>
            )}
          </div>

          <dl className="pricing-suggestion__price-reference">
            <div>
              <dt>Giá đang bán</dt>
              <dd>{formatVnd(suggestion.current_price)}</dd>
            </div>
            <div>
              <dt>Giá gốc của phòng</dt>
              <dd>{formatVnd(suggestion.base_price)}</dd>
            </div>
          </dl>

          {locked && (
            <Alert
              type="warning"
              showIcon
              title="Ngày này đang có khách giữ chỗ"
              description="Chưa thể áp dụng giá mới đến khi giao dịch kết thúc."
              className="pricing-suggestion__alert"
            />
          )}
          {expired && (
            <Alert
              type="warning"
              showIcon
              title="Gợi ý này đã hết hiệu lực"
              description="Lấy lại gợi ý để xem mức giá phù hợp trước khi áp dụng."
              className="pricing-suggestion__alert"
            />
          )}

          <div className="pricing-suggestion__edit">
            <div className="pricing-suggestion__input-heading">
              <label htmlFor={`${id}-price`}>Giá bạn muốn áp dụng</label>
              {edited && (
                <span className="pricing-suggestion__edited-label">
                  Đã chỉnh sửa
                </span>
              )}
            </div>
            <InputNumber<number>
              id={`${id}-price`}
              className="pricing-suggestion__price-input"
              size="large"
              value={insufficient ? null : appliedPrice}
              onChange={onPriceChange}
              disabled={!canEdit}
              min={bounds?.min}
              max={bounds?.max}
              step={10000}
              precision={2}
              inputMode="decimal"
              changeOnBlur={false}
              suffix="₫"
              placeholder={
                insufficient ? 'Chưa có giá đề xuất' : 'Nhập mức giá'
              }
              formatter={(value, info) =>
                info.userTyping
                  ? info.input
                  : value === undefined || value === null
                    ? ''
                    : numberFormatter.format(Number(value))
              }
              parser={parsePrice}
              status={invalidPrice ? 'error' : undefined}
              aria-describedby={`${id}-bounds${invalidPrice ? ` ${id}-error` : ''}`}
              aria-invalid={invalidPrice}
              onPressEnter={() => {
                if (canEdit && priceValid) onApply();
              }}
            />
            <p className="pricing-suggestion__bounds" id={`${id}-bounds`}>
              {bounds ? (
                <>
                  Trong khoảng {formatVnd(bounds.min)} – {formatVnd(bounds.max)}{' '}
                  (±30% giá gốc).
                </>
              ) : (
                'Cần có giá gốc hợp lệ để điều chỉnh giá.'
              )}
            </p>
            {invalidPrice && (
              <p
                className="pricing-suggestion__input-error"
                id={`${id}-error`}
                role="alert"
              >
                Nhập mức giá trong khoảng cho phép, tối đa 2 chữ số thập phân.
              </p>
            )}
            {edited && !insufficient && (
              <Button
                type="link"
                size="small"
                onClick={() => onPriceChange(suggestion.suggested_price)}
                disabled={!canEdit}
                className="pricing-suggestion__restore"
              >
                Dùng lại giá AI đề xuất
              </Button>
            )}
          </div>

          <div className="pricing-suggestion__actions">
            <Button
              type="primary"
              size="large"
              icon={<CheckOutlined />}
              onClick={onApply}
              loading={applying}
              disabled={!canEdit || !priceValid}
              block
            >
              Áp dụng giá
            </Button>
            <Button size="large" onClick={onDiscard} disabled={applying} block>
              Giữ giá hiện tại
            </Button>
          </div>
          <p className="pricing-suggestion__confirmation-note">
            Giá chỉ thay đổi sau bước xác nhận áp dụng.
          </p>
        </div>
      </div>
    </section>
  );
}
