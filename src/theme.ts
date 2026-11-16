import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#087f70', colorInfo: '#347b9c', colorSuccess: '#269176',
    colorWarning: '#cd8b37', colorError: '#d55b5b',
    colorText: '#243d3a', colorTextHeading: '#183c35', colorTextSecondary: '#74817c',
    colorBgBase: '#f7f8f5', colorBgContainer: '#ffffff',
    colorBorder: '#dce5df', colorBorderSecondary: '#eaf0eb',
    borderRadius: 10, borderRadiusLG: 16, controlHeight: 40, controlHeightLG: 48,
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13, lineHeight: 1.65,
    boxShadow: '0 6px 24px rgba(22, 60, 48, 0.06)',
    boxShadowSecondary: '0 12px 40px rgba(22, 60, 48, 0.09)',
  },
  components: {
    Layout: { bodyBg: '#f7f8f5', siderBg: '#133c35', headerBg: '#ffffff' },
    Menu: { darkItemBg: '#133c35', darkItemSelectedBg: '#256c5d', itemHeight: 46 },
    Button: { fontWeight: 600, primaryShadow: '0 4px 12px rgba(8, 127, 112, 0.14)' },
    Card: { headerFontSize: 15, headerHeight: 60, bodyPadding: 24, boxShadowTertiary: '0 3px 18px rgba(22, 60, 48, 0.03)' },
    Table: { headerBg: '#f5f8f5', headerColor: '#657b70', rowHoverBg: '#f5faf7', cellPaddingBlock: 17, headerSplitColor: 'transparent' },
    Tabs: { titleFontSize: 13, horizontalItemGutter: 28 },
    Input: { activeShadow: '0 0 0 3px rgba(8, 127, 112, 0.08)', paddingInline: 13 },
    Select: { optionSelectedBg: '#edf6ef', optionSelectedColor: '#087f70' },
    Statistic: { titleFontSize: 12, contentFontSize: 28 },
    Modal: { borderRadiusLG: 20, paddingContentHorizontalLG: 28 },
    Tag: { defaultBg: '#f3f6f1', defaultColor: '#677c6b' },
  },
};
