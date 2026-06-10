# LEGIT.md — Legit.Show 프로젝트 컨텍스트 (PRD)

> commit.show 의 피벗 제품. 같은 repo 안에서 구축. commit.show 컨텍스트는 [CLAUDE.md](CLAUDE.md),
> 이 문서는 **Legit.Show** 진실 소스. 매 세션 Legit 작업 시 이 파일을 먼저 읽을 것.
> 마지막 업데이트: 2026-06-10 (7-frame benchmark 전환).

---

## 0. 한 줄 정의

**Legit.Show** — 출시된 디지털 서비스(웹앱 · SaaS · AI 툴 · MCP 서버 · 개발자 도구 · 라이브러리)를
카탈로그화하고, 각 서비스에 **객관적 7-frame production-readiness 벤치마크**를 붙이는
**Yelp/디렉토리형 플랫폼**. (게임은 제외.)

```
정체성:  "Every launched service, tested." → 히어로: "Discover Legit Products"
모델:    디렉토리(발견) + 객관 벤치마크(신뢰) + 사람 리뷰/평점(검증)
North Star: vibe-coded MVP → production-ready 까지 audit + 안내 (commit.show 와 공유)
피벗:    commit.show(3주 시즌 바이브코딩 리그) → Legit.Show(상시 디렉토리). 2026-06 진행.
```

- **도메인**: legit.show (+ www.legit.show → 301). 이전 commit.show / www.commit.show → legit.show 301.
- **배포**: Cloudflare Pages (commitshow/commitshow main 자동 빌드). Supabase URL 동일 (tekemubwihsjdzittoqf).
- **운영 entity**: Madeflo Inc. (Delaware corp · commit.show 와 공유).
- **메타 repo**: austinpw-cloud/legitshow (private · 메서드 olog/리포트 문서 보관).

---

## 1. 라우팅 (src/App.tsx)

| 경로 | 페이지 | 비고 |
|---|---|---|
| `/` | DirectoryPage | 디렉토리 홈 · `?cat=` `?platform=` 필터 · KPI · featured |
| `/s/:slug` | ListingDetailPage | 서비스 상세 · 벤치마크 차트 + 근거 모달 · 리뷰/평점/리액션 · "Claim it" |
| `/insights` | InsightsPage | 데이터 대시보드 (카테고리·품질분포·trust posture·소스) |
| `/alternatives/:slug` | AlternativesPage | "X 대안" 비교 페이지 (moat · 프레임 비교) |
| `/add` | LegitSubmitPage | 셀프 등록 (owner-gated · verify 통과해야 publish) |
| `/v2/admin` | DirectoryAdminPage | 관리자 (벤치마크 재실행 · 모니터) |
| `/old` | LandingPage | 이전 commit.show 랜딩 (보존) |

UI 디자인 언어: **Fraunces(serif) + amber/cream**. commit.show(네이비/골드)와 별개. `.lgt`/`.l-` prefix 스코프 CSS (legit.tsx 내 주입).

---

## 2. 데이터 모델 (Supabase)

마이그레이션 진실 소스: `supabase/migrations/` (`20260606_directory_listings.sql` 이후 Legit 계열).

```
listings              -- 핵심 · 모든 서비스 한 행
  name · slug · domain · url · tagline · description
  category · subcategory · platform · pricing · has_pricing
  image_url · icon_url · source · meta · info_as_of · created_at
  benchmark jsonb      -- 7-frame 벤치마크 (schema 2 · §3 · BENCHMARK.md)
  submitted_by · verified_by · verified_at   -- 오너 검증
  canonical_key        -- dedup 키 (20260610)
listing_ratings       -- 별점 (member · listing · stars · UNIQUE)
listing_reviews       -- 텍스트 리뷰
listing_reactions     -- 태그 리액션 (works_great · easy · fast · buggy · …) + stats 뷰
listing_tickets       -- "I use this" 사용 신호 (ticketTier)
```

마이그레이션 목록(Legit): directory_listings · legit_weekly_ingest · listing_reactions(+stats) ·
listing_subcategory · listing_submitted_by · listings_icon_url · legit_tickets · listing_verify ·
listing_ratings · listings_benchmark · listing_reviews · listings_canonical_key.

RLS: public-read · service-role write (벤치마크/ingest). 평점/리뷰/리액션은 로그인 member.

---

## 3. 7-Frame 벤치마크 (요약 · 상세 = BENCHMARK.md)

> 2026-06-10 전환: 기존 4축(Quality·Trust·Activity·Transparency) → **7 프레임**.
> 엔진: `supabase/functions/benchmark-listing/index.ts` (schema 2). 결정론적 · LLM 없음.

**"데모와 프로덕션을 가르는 7가지"**, **URL/헤더/Lighthouse 만으로 측정** → closed-source SaaS 도 평가 가능:

```
1 performance      Lighthouse perf
2 accessibility    Lighthouse a11y
3 security         transport · 보안 헤더(CSP·HSTS·X-Frame·…) · 번들 시크릿 스캔 · mixed content
4 privacy          privacy/terms 페이지 · 쿠키 동의 배너
5 reliability      multi-route 도달 · 유효 SSL · 진짜 404
6 standards        Lighthouse best-practices · responsive · favicon/manifest
7 discoverability  title · meta · OG · canonical · structured-data · sitemap
+ maintenance      (조건부) code host(github/npm) 또는 오너 연결 repo 있을 때만 ·
                   푸터 연도/last-modified 같은 노이즈로 가짜 측정 안 함
```

**핵심 원칙**
- 측정 못 하는 프레임 = `null`(n/a) · **0으로 부풀리지 않음**. 근거 모달이 n/a 사유 표기.
- form별 정직: web=7프레임 / github·npm=security·maintenance·standards·discoverability subset / app_store=privacy·discoverability·maintenance subset.
- `overall` = assessed 프레임 평균 (어드민 전용 · 공개는 프레임별 막대).
- **무결성**: 객관 측정은 오너 자기보고로 절대 바뀌지 않음. 오너는 "repo/증빙 제공 → 우리가 실측"으로 더 깊은 측정을 unlock (자기신고 가산점 ✗) — §8 planned.

**UI**: `BenchmarkChart`(assessed 프레임 막대) + "See the evidence →" → `BenchmarkDetailModal`
(프레임별 ✓/✕/값 근거 + n/a 사유). [src/pages/legit.tsx](src/pages/legit.tsx).

전 313개 listing schema 2 재벤치 완료 (2026-06-10).

---

## 4. Ingest 파이프라인

엣지 함수 `supabase/functions/ingest-directory/index.ts` — action 분기:

```
ingest          (admin)  URL → Claude(haiku extract · sonnet compose · json_schema) 로
                         grounded enrichment + 12-카테고리 분류 → listings upsert
submit          (member) preview/fields — /add 페이지 1단계 (공개 페이지에서 prefill)
verify_prepare  (member) 도메인 소유 검증 토큰(HMAC) 발급
verify_publish  (member) meta-tag / DNS TXT 확인 → 통과 시에만 listings 생성 (owner-verified)
update          (owner)  본인/admin 만 수정
```

- **자동 벤치마크**: 매 ingest 직후 `benchmark-listing { pending:true }` 트리거 (NULL 만 스코어).
- **주간 cron**: `20260607_legit_weekly_ingest.sql` · pg_cron 월요일 · 전 listing 재벤치.
- Claude 모델: extract=haiku-4-5 · compose=sonnet-4-6. Lighthouse=PageSpeed Insights(real).

---

## 5. 카테고리 (12 canonical)

```
AI & Agents · Developer Tools · MCP & Integrations · Frameworks & Starter Kits ·
Infrastructure & DevOps · Data & Analytics · Productivity · Business & Finance ·
Design & Creative · Content & Docs · Education & Reference · Lifestyle & Other
```
+ `subcategory` (자유) · `platform` (web/ios/…) 보조 축. (95개 난립 → 12개 통합 · 2026-06.)

---

## 6. 오너 검증 (verify-gated publish)

- **원칙(2026-06)**: 등록 후 오너 주장(claim) ✗ → **인증 통과해야 publish** ✓. 인증 안 되면 listing 자체가 안 생김.
- 방법: `<meta name="legit-verify" content="<token>">` 또는 DNS TXT `_legit.<domain>=<token>`.
- 토큰: 결정론적 HMAC (listing 없어도 발급 가능 · crypto.subtle).
- 상세 페이지엔 작은 "Is this your service? Claim it" 인라인 (대문짝 ✗ · 상세는 주로 비-오너가 봄).
- 정책 A (no-claim for URL-only) 유지 — URL 만으론 소유 검증 불가하므로 claim 버튼 안 둠.

---

## 7. Insights · Alternatives · SEO/AEO

- **/insights**: 카테고리별 품질 · 품질 분포(밴드) · trust&security posture(%HTTPS/CSP/privacy + Lighthouse perf/a11y) · 소스 분포. 벤치마크 signals 집계. 깔끔/무-사족 톤.
- **/alternatives/:slug**: "X 대안" 비교 테이블 (subject + 대안들 · 프레임 비교) · ItemList + aggregateRating JSON-LD. **moat** (경쟁 디렉토리에 없음).
- **SEO/AEO**: `functions/_middleware.ts` SSR-light meta + JSON-LD (`/` WebSite · `/s/` SoftwareApplication+AggregateRating · `/insights` · `/alternatives/` ItemList · BreadcrumbList). `functions/sitemap.xml.ts` 동적 (754 URL · /s/ + /alternatives/ + 섹션). 도메인 301 일원화 (commit.show → legit.show).
- ⚠️ **미해결(사용자 측)**: Cloudflare legit.show zone 의 AI-bot 차단 해제 (AEO 차단 요소) · Google Cloud OAuth branding legit.show · GSC/Bing 등록.

---

## 8. 진행 현황

### 완료
- ✅ 디렉토리 풀스택 (/ · /s/ · /insights · /alternatives · /add · /v2/admin)
- ✅ 313 listing · 12-카테고리 통합 · 전부 벤치마크
- ✅ Ingest 파이프라인 (Claude grounded enrichment) + 자동 벤치 + 주간 cron
- ✅ 별점 · 텍스트 리뷰 · 태그 리액션 · "I use this" 티켓
- ✅ 오너 검증 verify-gated publish (meta-tag / DNS TXT)
- ✅ /v2 → root 승격 · commit.show → /old · 도메인 legit.show 일원화 (Supabase Auth + 301)
- ✅ **7-frame 벤치마크 전환** (2026-06-10) — 엔진 재작성 + 근거 모달 + 전 313 재벤치 (BENCHMARK.md)

### Planned (다음)
- ☐ **시계열** `benchmark_history` — 주간 cron 스냅샷 누적 → 트렌드·most-improved·종단 데이터셋 (인용가치↑). *전 벤치마크 안정화 후 진행.*
- ☐ **repo 심화 평가 + 오너 unlock** — 오너가 repo/증빙 제공 → tests/CI/의존성취약점 실측으로 closed-web 의 maintenance/craftsmanship 프레임 채움 + 뱃지(Source-verified · Verified owner). 자기신고 가산점 아님(실측). (BENCHMARK.md §repo-eval)
- ☐ **"according" 데이터 리포트** — 정기 발행으로 citable authority(AEO/백링크). `/reports` + `/methodology`. (REPORTS.md)
- ☐ Cloudflare AI-bot 차단 해제 (AEO) · GSC/Bing/Change-of-Address
- ☐ Alternatives 테이블 7-frame 표기 이전 (현재 legacy 4축 derived)

---

## 9. 작업 가이드 (Legit)

- UI 문자열 전부 American English. 대화는 한글.
- 디자인: Fraunces + amber/cream · `.l-` prefix · 모바일 input ≥16px(zoom 차단).
- 벤치마크 무결성: 측정 신호만 점수 반영 · 노이즈 신호(푸터 연도 등) 금지 · 오너 자기신고 점수 반영 금지.
- 마이그레이션: `supabase/migrations/YYYYMMDD_*.sql` · psql 직접 실행(.env.local) · 컬럼 추가 시 GRANT.
- 배포: push to main → Cloudflare Pages 자동 빌드. 엣지 함수는 `supabase functions deploy <name>` 별도.
- 콘텐츠 surface 는 CRUD 보장 (author Edit/Delete 기본 노출).
