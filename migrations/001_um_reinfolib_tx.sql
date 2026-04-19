-- UpgradeMap 自建 reinfolib 原始交易表（独立于 YieldMap）
-- 目的：覆盖 23 区 × 最近 10+ 年季度交易数据，供评分引擎计算房价信号

CREATE TABLE IF NOT EXISTS public.um_reinfolib_tx (
  id              BIGSERIAL PRIMARY KEY,
  ward_code       VARCHAR(5) NOT NULL,
  year            INT        NOT NULL,
  quarter         INT        NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  district_name   TEXT,
  trade_price     BIGINT,            -- 取引価格 総額（円）
  price_per_sqm   NUMERIC,           -- ㎡単価（円）。空則从 trade_price/area_sqm 补
  area_sqm        NUMERIC,
  building_year   INT,
  building_type   TEXT,              -- マンション等／宅地 等
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_um_reinfolib_tx_ward_period
  ON public.um_reinfolib_tx (ward_code, year, quarter);

CREATE INDEX IF NOT EXISTS idx_um_reinfolib_tx_fetched
  ON public.um_reinfolib_tx (fetched_at);
