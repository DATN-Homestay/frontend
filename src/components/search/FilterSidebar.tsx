import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Input, Radio } from 'antd';
import { DownOutlined, FilterOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import type { FacetOption, Facets, SearchCriteria } from '../../utils/homestaySearch';
import './FilterSidebar.css';

type ListKey = 'prices' | 'types' | 'amenities' | 'meals' | 'sources';

interface Props {
  facets: Facets;
  criteria: SearchCriteria;
  onChange: (patch: Partial<SearchCriteria>) => void;
  onReset: () => void;
}

const AMENITY_PREVIEW = 10;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="filter-section">
      <h3>{title}</h3>
      {hint && <p className="filter-section-hint">{hint}</p>}
      <div className="filter-options">{children}</div>
    </section>
  );
}

/** Nội dung một dòng lọc: nhãn bên trái, số căn bên phải (đặt bên trong Checkbox/Radio, không lồng thêm <label>) */
function RowLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      <span className={`filter-option-label${count === 0 ? ' is-empty' : ''}`}>{label}</span>
      <span className="filter-option-count">{count.toLocaleString('vi-VN')}</span>
    </>
  );
}

/** Cột bộ lọc bên trái: mỗi lựa chọn kèm số căn sẽ còn lại nếu tick */
export default function FilterSidebar({ facets, criteria, onChange, onReset }: Props) {
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllPopularAmenities, setShowAllPopularAmenities] = useState(false);
  const [amenityQuery, setAmenityQuery] = useState('');
  const activeCount = criteria.prices.length + criteria.types.length + criteria.amenities.length
    + criteria.meals.length + criteria.sources.length + Number(criteria.minRating !== undefined);

  const toggle = (key: ListKey, value: string) => {
    const current = criteria[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ [key]: next } as Partial<SearchCriteria>);
  };

  // Ẩn lựa chọn không còn căn nào, trừ khi đang được chọn (để còn bỏ chọn được)
  const visible = (options: FacetOption[], selected: string[]) =>
    options.filter((o) => o.count > 0 || selected.includes(o.key));

  const checkList = (key: ListKey, options: FacetOption[]) => {
    const selected = criteria[key] as string[];
    const available = visible(options, selected);
    if (!available.length) return <p className="filter-empty">Chưa có lựa chọn phù hợp.</p>;
    return available.map((o) => (
      <Checkbox key={o.key} checked={selected.includes(o.key)} onChange={() => toggle(key, o.key)}>
        <RowLabel label={o.label} count={o.count} />
      </Checkbox>
    ));
  };

  const amenities = visible(facets.amenity, criteria.amenities);
  const popularAmenities = visible(facets.popularAmenity, criteria.amenities);
  const shownPopularAmenities = showAllPopularAmenities
    ? popularAmenities
    : popularAmenities.filter((o, index) => index < AMENITY_PREVIEW || criteria.amenities.includes(o.key));
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const query = normalize(amenityQuery.trim());
  const matchingAmenities = amenities.filter((o) => normalize(o.label).includes(query));
  const shownAmenities = showAllAmenities || query
    ? matchingAmenities
    : matchingAmenities.filter((o, index) => index < AMENITY_PREVIEW || criteria.amenities.includes(o.key));

  return (
    <aside className="stayai-filter" aria-label="Bộ lọc">
      <div className="filter-heading">
        <div><FilterOutlined /><h2>Bộ lọc</h2>{activeCount > 0 && <span className="filter-active-count">{activeCount}</span>}</div>
        <Button type="link" size="small" disabled={!activeCount} onClick={onReset}>Đặt lại</Button>
      </div>

      <Section title="Ngân sách mỗi đêm" hint="Giá phòng / đêm (VND)">{checkList('prices', facets.price)}</Section>

      <Section title="Loại chỗ ở">{checkList('types', facets.type)}</Section>

      <Section title="Điểm đánh giá">
        <Radio.Group
          value={criteria.minRating ?? null}
          onChange={(e) => onChange({ minRating: e.target.value ?? undefined })}
          aria-label="Điểm đánh giá tối thiểu"
          className="filter-rating-options"
        >
          {facets.rating.map((o) => (
            <Radio key={o.key} value={Number(o.key)}>
              <RowLabel label={o.label} count={o.count} />
            </Radio>
          ))}
        </Radio.Group>
        {criteria.minRating !== undefined && (
          <Button type="link" size="small" className="filter-text-button" onClick={() => onChange({ minRating: undefined })}>
            Bỏ chọn điểm
          </Button>
        )}
      </Section>

      <Section title="Tiện ích phổ biến" hint="Chọn các tiện ích bạn muốn có">
        {checkList('amenities', shownPopularAmenities)}
        {popularAmenities.length > AMENITY_PREVIEW && (
          <Button type="link" size="small" className="filter-text-button" icon={showAllPopularAmenities ? <UpOutlined /> : <DownOutlined />} onClick={() => setShowAllPopularAmenities((value) => !value)}>
            {showAllPopularAmenities ? 'Thu gọn tiện ích' : `Thêm tiện ích (${popularAmenities.length - shownPopularAmenities.length})`}
          </Button>
        )}
      </Section>

      <Section title="Tiện nghi & dịch vụ khác" hint="Tìm tiện nghi chi tiết của chỗ nghỉ">
        <Input
          aria-label="Tìm tiện nghi"
          placeholder="Tìm tiện nghi..."
          prefix={<SearchOutlined />}
          allowClear
          value={amenityQuery}
          onChange={(event) => setAmenityQuery(event.target.value)}
          className="filter-amenity-search"
        />
        {shownAmenities.map((o) => (
          <Checkbox key={o.key} checked={criteria.amenities.includes(o.key)} onChange={() => toggle('amenities', o.key)}>
            <RowLabel label={o.label} count={o.count} />
          </Checkbox>
        ))}
        {!shownAmenities.length && <p className="filter-empty">Không tìm thấy tiện nghi phù hợp.</p>}
        {!query && amenities.length > AMENITY_PREVIEW && (
          <Button type="link" size="small" className="filter-text-button" icon={showAllAmenities ? <UpOutlined /> : <DownOutlined />} onClick={() => setShowAllAmenities((v) => !v)}>
            {showAllAmenities ? 'Thu gọn' : `Xem tất cả ${amenities.length} tiện nghi`}
          </Button>
        )}
      </Section>

      <Section title="Ăn uống & nhà bếp">{checkList('meals', facets.meal)}</Section>

      <Section title="Hình thức đặt phòng">{checkList('sources', facets.source)}</Section>
    </aside>
  );
}
