# Deployment Runbook — quality-dashboard

코드 품질(코라 검수)과 배포 조건은 별개다. 코라가 승인해도 아래 6개 영역은 자동으로 보장되지 않는다.

**규칙**: 하나라도 미완이면 배포하지 않는다.

---

## 1. Git 상태

```bash
git status --short
```

- [ ] 미커밋 파일 없음 (또는 의도적으로 제외한 이유 확인)
- [ ] `.env`, `cache/`, `test-plugin/` 등 민감/불필요 파일 미포함
- [ ] `docs/reviews/result-*.md` 코라 최종 결과 파일 커밋 완료

---

## 2. 테스트 + 빌드

```bash
npm test
npm run build
```

- [ ] 전체 테스트 통과 (실패 있으면 배포 금지)
- [ ] 빌드 성공
- [ ] 빌드 로그 이상 없음 (경고 포함 확인)

---

## 3. DB (Neon)

- [ ] 이번 배포에 스키마 변경이 있었는가?
  - **있다면**: 운영 Neon DB에 동일 migration SQL 직접 실행 완료 확인
  - **없다면**: 생략 가능
- [ ] 운영 DB와 로컬 DB 스키마 일치 확인

> 로컬: `ep-shy-brook-ap3nla48-pooler` / 운영: Vercel에 연결된 Neon 인스턴스

---

## 4. 환경변수 (Vercel Production)

- [ ] 이번 배포에서 새로 추가한 env가 있는가?
  - **있다면**: Vercel 대시보드 > Settings > Environment Variables에서 Production 확인
- [ ] AI API key — `ANTHROPIC_API_KEY` Production/Preview 분리 확인
- [ ] Naver API — `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` 설정 확인
- [ ] Upstash (Rate Limiting) — `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 설정 여부
  - 미설정 시 fail-open으로 동작 (허용된 상태)

**주의**: `BLOB_STORE_ID` 추가 금지 — OIDC 인증 우선순위 충돌로 분석 실패 장애 전례 있음

---

## 5. 데이터 민감정보

- [ ] 실고객명 없음
- [ ] 원가·단가·계약 금액 없음
- [ ] 입찰·수주 민감 정보 없음
- [ ] 시연 데이터 또는 테스트 계정만 사용 중

---

## 6. 최종 증적

- [ ] 코라 최종 검수 결과 파일 저장 (`docs/reviews/result-YYYY-MM-DD_*.md`)
- [ ] 배포 URL 접속 확인: https://quality-dashboard-flax.vercel.app
- [ ] 주요 화면 1~2개 동작 확인 (로그인 → 대시보드 → 클레임 또는 NCR)

---

## 배포 명령

```bash
# GitHub push (자동 배포 연동 시)
git push origin master

# 자동 배포 안 될 경우 CLI 직접 배포
vercel --prod
```

---

## 미커밋 파일 규칙

| 파일 수 | 행동 |
|---------|------|
| 1~5 | 정상 — 배포 진행 가능 |
| 6~10 | `npm test` + 상태 확인 후 진행 |
| 11 이상 | 커밋 분리 먼저, 기능 추가 중단 |
| 20 이상 | 클로이에게 커밋 분리 계획 요청 |
