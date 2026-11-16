import { useState } from 'react';
import { Button, Checkbox, Radio, Typography } from 'antd';
import type { FacetOption, Facets, SearchCriteria } from '../../utils/homestaySearch';

const { Text } = Typography;

type ListKey = 'prices' | 'types' | 'amenities' | 'meals' | 'sources';

interface Props {
  facets: Facets;
  criteria: SearchCriteria;
  onChange: (patch: Partial<SearchCriteria>) => void;
}

const AMENITY_PREVIEW = 10;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
      <Text strong style={{ display: 'block', fontSize: 15, marginBottom: 8, color: '#0f172a' }}>
        {title}
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </section>
  );
}

/** Nội dung một dòng lọc: nhãn bên trái, số căn bên phải (đặt bên trong Checkbox/Radio, không lồng thêm <label>) */
function RowLabel({ label, count }: { label: string; count: number }) {
  return (
    <>
      <span style={{ flex: 1, fontSize: 14, color: count === 0 ? '#94a3b8' : '#1e293b' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#64748b', marginLeft: 8 }}>{count.toLocaleString('vi-VN')}</span>
    </>
  );
}

const SIDEBAR_CSS = `
.stayai-filter .ant-checkbox-wrapper, .stayai-filter .ant-radio-wrapper { width: 100%; margin-inline-end: 0; }
.stayai-filter .ant-checkbox-label, .stayai-filter .ant-radio-label { flex: 1; display: flex; align-items: center; }
`;

/** Cột bộ lọc bên trái: mỗi lựa chọn kèm số căn sẽ còn lại nếu tick */
export default function FilterSidebar({ facets, criteria, onChange }: Props) {
  const [showAllAmenities, setShowAllAmenities] = useState(false);

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
    return visible(options, selected).map((o) => (
      <Checkbox key={o.key} checked={selected.includes(o.key)} onChange={() => toggle(key, o.key)}>
        <RowLabel label={o.label} count={o.count} />
      </Checkbox>
    ));
  };

  const amenities = visible(facets.amenity, criteria.amenities);
  const shownAmenities = showAllAmenities ? amenities : amenities.slice(0, AMENITY_PREVIEW);

  return (
    <aside className="stayai-filter" aria-label="Bộ lọc" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <style>{SIDEBAR_CSS}</style>
      <div style={{ padding: '14px 16px' }}>
        <Text strong style={{ fontSize: 16 }}>
          Chọn lọc theo:
        </Text>
      </div>

      <Section title="Ngân sách mỗi đêm">{checkList('prices', facets.price)}</Section>

      <Section title="Điểm đánh giá">
        <Radio.Group
          value={criteria.minRating ?? null}
          onChange={(e) => onChange({ minRating: e.target.value ?? undefined })}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {facets.rating.map((o) => (
            <Radio key={o.key} value={Number(o.key)}>
              <RowLabel label={o.label} count={o.count} />
            </Radio>
          ))}
        </Radio.Group>
        {criteria.minRating !== undefined && (
          <Button type="link" size="small" style={{ padding: 0, alignSelf: 'flex-start' }} onClick={() => onChange({ minRating: undefined })}>
            Bỏ chọn điểm
          </Button>
        )}
      </Section>

      <Section title="Loại chỗ ở">{checkList('types', facets.type)}</Section>

      <Section title="Tiện nghi phổ biến">
        {shownAmenities.map((o) => (
          <Checkbox key={o.key} checked={criteria.amenities.includes(o.key)} onChange={() => toggle('amenities', o.key)}>
            <RowLabel label={o.label} count={o.count} />
          </Checkbox>
        ))}
        {amenities.length > AMENITY_PREVIEW && (
          <Button type="link" size="small" style={{ padding: 0, alignSelf: 'flex-start' }} onClick={() => setShowAllAmenities((v) => !v)}>
            {showAllAmenities ? 'Thu gọn' : `Xem thêm ${amenities.length - AMENITY_PREVIEW} tiện nghi`}
          </Button>
        )}
      </Section>

      <Section title="Bữa ăn">{checkList('meals', facets.meal)}</Section>

      <Section title="Hình thức đặt phòng">{checkList('sources', facets.source)}</Section>
    </aside>
  );
}
